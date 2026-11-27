import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from "firebase/auth";

function localUrl(value) {
  const url = new URL(value);
  assert.ok(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname), "Use only local emulator and application URLs.");
  return url.origin;
}

const emulator = localUrl(process.env.COLLABSPHERE_AUTH_EMULATOR_URL || "http://127.0.0.1:9099");
const app = localUrl(process.env.COLLABSPHERE_TEST_URL || "http://127.0.0.1:3000");
const project = "demo-collabsphere";

async function response(url, { token, body, status = 200 } = {}) {
  const result = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  assert.equal(result.status, status, "Unexpected status from " + new URL(url).pathname);
  return result.status === 204 ? undefined : result.json();
}

const api = (path, options) => response(app + "/api" + path, options);
const auth = (action, body) => response(emulator + "/identitytoolkit.googleapis.com/v1/accounts:" + action + "?key=local-emulator-key", { body });
const runtime = await api("/config");
assert.equal(runtime.firebase.projectId, project);
assert.equal(runtime.firebase.emulatorUrl, emulator);
await api("/account", { token: "syntactically.valid.invalid.signature", status: 401 });

const googleApp = initializeApp({ apiKey: "local-emulator-key", projectId: project }, "google-smoke");
try {
  const googleAuth = getAuth(googleApp);
  connectAuthEmulator(googleAuth, emulator, { disableWarnings: true });
  const googleEmail = "google-" + randomUUID() + "@example.test";
  const google = await signInWithCredential(googleAuth, GoogleAuthProvider.credential(JSON.stringify({
    sub: randomUUID(), email: googleEmail, email_verified: true, name: "Emulator Google User",
  })));
  assert.equal(google.providerId, GoogleAuthProvider.PROVIDER_ID);
  assert.equal(google.user.emailVerified, true);
  assert.equal((await api("/account", { token: await google.user.getIdToken() })).account.email, googleEmail);
} finally {
  await deleteApp(googleApp);
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
  const account = await api("/account", { token: login.idToken });
  assert.equal(account.account.email, email);
  return { email, token: login.idToken, userId: login.localId };
}

const brand = await verifiedUser("brand");
const creator = await verifiedUser("creator");
const workspace = await api("/workspaces", { token: brand.token, body: { name: "Emulator Studio" }, status: 201 });
const workspacePath = "/workspaces/" + workspace.id;
await api(workspacePath, { token: creator.token, status: 404 });
const campaign = await api(workspacePath + "/campaigns", {
  token: brand.token,
  body: { title: "Emulator product launch", brief: "Film a product introduction for a short launch video." },
  status: 201,
});
const campaignPath = workspacePath + "/campaigns/" + campaign.id;
await api(campaignPath + "/status", { token: brand.token, body: { status: "open" }, status: 204 });
await api("/creator-profile", {
  token: creator.token,
  body: { displayName: "Emulator Creator", niche: "Product film", bio: "Creator for this local integration test.", portfolioUrl: "", published: true },
  status: 204,
});
const directory = await api(workspacePath + "/creators?q=emulator", { token: brand.token });
assert.ok(directory.creators.some((entry) => entry.userId === creator.userId));
const offer = await api(campaignPath + "/offers", {
  token: brand.token, body: { creatorId: creator.userId, amountCents: 85000, note: "One launch video." }, status: 201,
});
const offerPath = "/offers/" + offer.id;
await api(offerPath + "/response", { token: creator.token, body: { action: "accept" }, status: 204 });
await api(offerPath + "/deliverables", { token: creator.token, body: { url: "https://example.test/emulator-deliverable" }, status: 204 });
await api(offerPath + "/review", { token: brand.token, body: { revision: 1, decision: "approved" }, status: 204 });
assert.equal((await api("/account", { token: creator.token })).offers[0].status, "approved");
console.log("Firebase Auth Emulator passed: Google, email verification, identity isolation, and brand-to-creator approval.");
