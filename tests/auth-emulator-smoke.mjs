import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as delay } from "node:timers/promises";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from "firebase/auth";

function localUrl(value) {
  const url = new URL(value);
  assert.ok(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname), "Use only local emulator and application URLs.");
  return url.origin;
}

const restart = process.argv.includes("--restart");
const emulator = localUrl(process.env.COLLABSPHERE_AUTH_EMULATOR_URL || "http://127.0.0.1:9099");
const app = localUrl(process.env.COLLABSPHERE_TEST_URL || (restart ? "http://127.0.0.1:5191" : "http://127.0.0.1:3000"));
const project = "demo-collabsphere";
const sandbox = restart ? await mkdtemp(join(tmpdir(), "collabsphere-e2e-")) : null;
const databasePath = sandbox ? join(sandbox, "collabsphere.sqlite") : null;
let appProcess;

async function stopApp() {
  if (!appProcess) return;
  const processToStop = appProcess;
  appProcess = undefined;
  if (!processToStop.pid || processToStop.exitCode !== null || processToStop.signalCode !== null) return;
  const exit = once(processToStop, "exit");
  processToStop.kill();
  await exit;
}

async function startApp() {
  const environment = {
    ...process.env,
    NODE_ENV: "test",
    DISABLE_HMR: "true",
    HOST: new URL(app).hostname,
    PORT: new URL(app).port,
    FIREBASE_PROJECT_ID: project,
    FIREBASE_API_KEY: "local-emulator-key",
    FIREBASE_AUTH_DOMAIN: project + ".firebaseapp.com",
    FIREBASE_APP_ID: "",
    FIREBASE_AUTH_EMULATOR_HOST: new URL(emulator).host,
    COLLABSPHERE_DB_PATH: databasePath,
  };
  delete environment.GOOGLE_APPLICATION_CREDENTIALS;
  appProcess = spawn(process.execPath, ["--import", "tsx", "server.ts"], {
    env: environment,
    stdio: "ignore",
  });
  let startupError;
  appProcess.once("error", (error) => { startupError = error; });
  for (let attempt = 0; attempt < 80; attempt++) {
    if (startupError) throw startupError;
    if (appProcess.exitCode !== null) throw new Error("The test app stopped before reporting readiness.");
    const outcome = await fetch(app + "/api/health", { signal: AbortSignal.timeout(1000) }).catch(() => null);
    if (outcome?.ok) {
      const health = await outcome.json().catch(() => null);
      if (health?.status === "ready" && health.accounts === "enabled") return;
    }
    await delay(250);
  }
  throw new Error("The test app did not start before the timeout.");
}

async function response(url, { token, body, status = 200, method = body ? "POST" : "GET" } = {}) {
  const result = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  assert.ok([status].flat().includes(result.status), "Unexpected status " + result.status + " from " + new URL(url).pathname);
  return result.status === 204 ? undefined : result.json();
}

const api = (path, options) => response(app + "/api" + path, options);
const auth = (action, body) => response(emulator + "/identitytoolkit.googleapis.com/v1/accounts:" + action + "?key=local-emulator-key", { body });

async function checkGoogle() {
  const googleApp = initializeApp({ apiKey: "local-emulator-key", projectId: project }, "google-smoke");
  try {
    const googleAuth = getAuth(googleApp);
    connectAuthEmulator(googleAuth, emulator, { disableWarnings: true });
    const email = "google-" + randomUUID() + "@example.test";
    const credential = await signInWithCredential(googleAuth, GoogleAuthProvider.credential(JSON.stringify({
      sub: randomUUID(), email, email_verified: true, name: "Emulator Google User",
    })));
    assert.equal(credential.providerId, GoogleAuthProvider.PROVIDER_ID);
    assert.equal(credential.user.emailVerified, true);
    assert.equal((await api("/account", { token: await credential.user.getIdToken() })).account.email, email);
  } finally {
    await deleteApp(googleApp);
  }
}

async function verifiedUser(role) {
  const email = role + "-" + randomUUID() + "@example.test";
  const password = "Local-only-" + randomUUID();
  const signup = await auth("signUp", { email, password, returnSecureToken: true });
  await api("/account", { token: signup.idToken, status: 403 });
  await auth("sendOobCode", { requestType: "VERIFY_EMAIL", idToken: signup.idToken });
  const { oobCodes } = await response(emulator + "/emulator/v1/projects/" + project + "/oobCodes");
  const code = oobCodes.find((entry) => entry.email === email && entry.requestType === "VERIFY_EMAIL");
  assert.ok(code, "Expected a Firebase Auth verification code.");
  await auth("update", { oobCode: code.oobCode });
  const login = await auth("signInWithPassword", { email, password, returnSecureToken: true });
  assert.equal((await api("/account", { token: login.idToken })).account.email, email);
  return { email, token: login.idToken, userId: login.localId };
}

try {
  if (restart) await startApp();
  const runtime = await api("/config");
  assert.equal(runtime.firebase.projectId, project);
  assert.equal(runtime.firebase.emulatorUrl, emulator);
  await api("/account", { status: 401 });
  await api("/account", { token: "syntactically.valid.invalid.signature", status: 401 });
  await checkGoogle();
  console.log("PASS Google identity and anonymous/invalid token rejection.");

  const [brand, creator, editor, outsider] = await Promise.all(["brand", "creator", "editor", "outsider"].map(verifiedUser));
  const { id: workspaceId } = await api("/workspaces", { token: brand.token, body: { name: "Emulator Studio" }, status: 201 });
  const { id: outsideId } = await api("/workspaces", { token: outsider.token, body: { name: "Private Outside Studio" }, status: 201 });
  const workspace = "/workspaces/" + workspaceId;
  const outside = "/workspaces/" + outsideId;
  const invite = await api(workspace + "/invites", { token: brand.token, body: { email: editor.email }, status: 201 });
  await api("/invites/accept", { token: outsider.token, body: { token: invite.token }, status: 404 });
  await api("/invites/accept", { token: editor.token, body: { token: invite.token } });
  await api("/invites/accept", { token: editor.token, body: { token: invite.token }, status: 404 });
  assert.equal((await api(workspace, { token: editor.token })).workspace.role, "editor");
  await api(workspace + "/invites", { token: editor.token, body: { email: outsider.email }, status: 403 });
  await api(workspace, { token: creator.token, status: 404 });
  await api(workspace, { token: outsider.token, status: 404 });
  await api(outside, { token: brand.token, status: 404 });
  console.log("PASS email verification, one-use invites, owner/editor permission, and cross-workspace denial.");

  const { id: campaignId } = await api(workspace + "/campaigns", {
    token: editor.token,
    body: { title: "Emulator product launch", brief: "Film a product introduction for a short launch video." },
    status: 201,
  });
  const campaign = workspace + "/campaigns/" + campaignId;
  await api(outside + "/campaigns/" + campaignId + "/status", { token: outsider.token, body: { status: "open" }, status: 404 });
  await api(campaign + "/status", { token: editor.token, body: { status: "open" }, status: 204 });
  const creatorProfile = { displayName: "Emulator Creator", niche: "Product film", bio: "Creator for this local integration test.", portfolioUrl: "" };
  await api("/creator-profile", { token: creator.token, body: { ...creatorProfile, published: false }, status: 204 });
  assert.ok(!(await api(workspace + "/creators?q=emulator", { token: brand.token })).creators.some((entry) => entry.userId === creator.userId));
  await api("/creator-profile", { token: creator.token, body: { ...creatorProfile, published: true }, status: 204 });
  const directory = await api(workspace + "/creators?q=emulator", { token: editor.token });
  assert.ok(directory.creators.some((entry) => entry.userId === creator.userId));
  const newOffer = { token: brand.token, body: { creatorId: creator.userId, amountCents: 85000, note: "One launch video." }, status: [201, 409] };
  const concurrentOffers = await Promise.all([api(campaign + "/offers", newOffer), api(campaign + "/offers", newOffer)]);
  const created = concurrentOffers.filter((offer) => offer.id);
  assert.equal(created.length, 1, "An offer retry must not create a duplicate.");
  assert.match(concurrentOffers.find((offer) => offer.error).error, /already has an offer/);
  const offer = "/offers/" + created[0].id;
  console.log("PASS campaign scoping, creator publication consent, and 201/409 duplicate-offer race.");

  await api(offer + "/response", { token: creator.token, body: { action: "accept" }, status: 204 });
  await api(offer + "/response", { token: creator.token, body: { action: "accept" }, status: 409 });
  const firstRevision = { url: "https://example.test/emulator-deliverable-v1" };
  await api(offer + "/deliverables", { token: creator.token, body: firstRevision, status: 204 });
  await api(offer + "/deliverables", { token: creator.token, body: firstRevision, status: 409 });
  const creatorInvite = await api(workspace + "/invites", { token: brand.token, body: { email: creator.email }, status: 201 });
  await api("/invites/accept", { token: creator.token, body: { token: creatorInvite.token } });
  const feedback = "Please revise the final product close-up.";
  const revise = { revision: 1, decision: "changes_requested", feedback };
  await api(offer + "/review", { token: outsider.token, body: revise, status: 404 });
  await api(offer + "/review", { token: creator.token, body: { revision: 1, decision: "approved" }, status: 403 });
  await api(offer + "/review", { token: editor.token, body: revise, status: 204 });
  await api(offer + "/deliverables", { token: creator.token, body: { url: "https://example.test/emulator-deliverable-v2", note: "Updated product close-up." }, status: 204 });
  await api(offer + "/review", { token: brand.token, body: { revision: 1, decision: "approved" }, status: 409 });
  await api(offer + "/review", { token: brand.token, body: { revision: 2, decision: "approved" }, status: 204 });
  await api(campaign + "/status", { token: brand.token, body: { status: "closed" }, status: 204 });
  for (const member of [editor, creator]) {
    await api(workspace + "/members/" + member.userId, { token: brand.token, method: "DELETE", status: 204 });
  }
  console.log("PASS retry protection, independent deliverable review, revision resubmission, approval, and membership removal.");

  if (restart) {
    const initialPid = appProcess.pid;
    await stopApp();
    const db = new DatabaseSync(databasePath, { readOnly: true });
    try {
      assert.equal(db.prepare("PRAGMA user_version").get().user_version, 1);
      assert.equal(db.prepare("SELECT COUNT(*) AS count FROM deliverables WHERE offerId = ?").get(created[0].id).count, 2);
    } finally {
      db.close();
    }
    await startApp();
    assert.notEqual(appProcess.pid, initialPid);
  }

  const savedBrand = await api(workspace, { token: brand.token });
  assert.equal(savedBrand.workspace.id, workspaceId);
  assert.equal(savedBrand.campaigns.find((item) => item.id === campaignId).status, "closed");
  assert.equal(savedBrand.members.length, 1);
  const savedOffer = (await api("/account", { token: creator.token })).offers.find((item) => item.id === created[0].id);
  assert.equal(savedOffer.status, "approved");
  assert.deepEqual(savedOffer.deliverables.map(({ revision }) => revision), [2, 1]);
  assert.equal(savedOffer.deliverables[1].feedback, feedback);
  assert.ok(savedOffer.deliverables[0].url.endsWith("-v2"));
  await api(workspace, { token: editor.token, status: 404 });
  await api(workspace, { token: creator.token, status: 404 });
  assert.equal((await api("/account", { token: outsider.token })).offers.length, 0);
  assert.equal((await api(outside, { token: outsider.token })).campaigns.length, 0);
  console.log(restart
    ? "PASS connected SQLite migration and campaign, offer, revisions, and tenant isolation after a process restart."
    : "PASS approval history and tenant isolation.");
} finally {
  await stopApp();
  if (sandbox) await rm(sandbox, { recursive: true, force: true });
}
