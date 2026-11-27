import assert from "node:assert/strict";
import { type AddressInfo } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import express from "express";
import { workspaceApi } from "../server/api";
import { WorkspaceStore } from "../server/store";

const identities = {
  owner: { uid: "owner", email: "owner@example.test" },
  editor: { uid: "editor", email: "editor@example.test" },
  creator: { uid: "creator", email: "creator@example.test" },
  other: { uid: "other", email: "other@example.test" },
};
type Person = keyof typeof identities;

async function start(path: string, signedIn = true) {
  const store = new WorkspaceStore(path);
  const app = express();
  app.use("/api", workspaceApi(store, signedIn ? async (token) => {
    const actor = identities[token.split(".")[0] as Person];
    if (!actor) throw new Error("Invalid test credential");
    return actor;
  } : null, null));
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const origin = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
  return {
    async close() {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      store.close();
    },
    async request(person: Person | null, path: string, options: { method?: string; data?: unknown; status?: number } = {}) {
      const { method = "GET", data, status = 200 } = options;
      const headers = new Headers();
      if (person) headers.set("Authorization", "Bearer " + person + ".integration.fixture.token");
      if (data !== undefined) headers.set("Content-Type", "application/json");
      const response = await fetch(origin + "/api" + path, { method, headers, body: JSON.stringify(data) });
      const result = response.status === 204 ? undefined : await response.json();
      assert.equal(response.status, status, JSON.stringify(result));
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      return result;
    },
  };
}

const brief = { title: "Field launch", brief: "Create a product video featuring the compact outdoor collection." };
const profile = { displayName: "Lena Winters", niche: "Outdoor film", bio: "Video and documentary creator.", portfolioUrl: "https://example.test/work", published: true };

test("workspace and invitation access require verified actor scope", async (t) => {
  const api = await start(":memory:");
  t.after(() => api.close());
  const { request } = api;
  await request(null, "/account", { status: 401 });
  const { id } = await request("owner", "/workspaces", { method: "POST", data: { name: "Northfield Studio" }, status: 201 });
  const path = "/workspaces/" + id;
  await request("other", path, { status: 404 });
  await request("other", path + "/campaigns", { method: "POST", data: brief, status: 404 });
  const invite = await request("owner", path + "/invites", { method: "POST", data: { email: "Editor@Example.test " }, status: 201 });
  const invite2 = await request("owner", path + "/invites", { method: "POST", data: { email: "editor@example.test" }, status: 201 });
  const owner = await request("owner", path);
  assert.equal(owner.pendingInvites.length, 1);
  assert.equal(owner.pendingInvites[0].email, "editor@example.test");
  assert.ok(!JSON.stringify(owner).includes(invite2.token));
  await request("editor", "/invites/accept", { method: "POST", data: { token: invite.token }, status: 404 });
  await request("other", "/invites/accept", { method: "POST", data: { token: invite2.token }, status: 404 });
  await request("editor", "/invites/accept", { method: "POST", data: { token: invite2.token } });
  await request("editor", "/invites/accept", { method: "POST", data: { token: invite2.token }, status: 404 });
  assert.equal((await request("editor", path)).workspace.role, "editor");
  await request("editor", path + "/invites", { method: "POST", data: { email: "other@example.test" }, status: 403 });
  await request("editor", path + "/members/owner", { method: "DELETE", status: 403 });
  await request("editor", path + "/campaigns", { method: "POST", data: brief, status: 201 });
  await request("owner", path + "/members/owner", { method: "DELETE", status: 404 });
  await request("owner", path + "/members/editor", { method: "DELETE", status: 204 });
  await request("editor", path, { status: 404 });
  const revoked = await request("owner", path + "/invites", { method: "POST", data: { email: "other@example.test" }, status: 201 });
  const { pendingInvites } = await request("owner", path);
  await request("owner", path + "/invites/" + pendingInvites[0].id, { method: "DELETE", status: 204 });
  await request("other", "/invites/accept", { method: "POST", data: { token: revoked.token }, status: 404 });
});

test("brand offer, creator revision, and approval persist with restricted access", async (t) => {
  const folder = await mkdtemp(join(tmpdir(), "collabsphere-test-"));
  const file = join(folder, "collabsphere.sqlite");
  let api = await start(file);
  t.after(async () => {
    await api?.close();
    await rm(folder, { recursive: true, force: true });
  });
  const { request } = api;
  const { id: workspaceId } = await request("owner", "/workspaces", { method: "POST", data: { name: "Field Studio" }, status: 201 });
  const { id: otherWorkspaceId } = await request("other", "/workspaces", { method: "POST", data: { name: "Other Studio" }, status: 201 });
  const workspace = "/workspaces/" + workspaceId;
  await request("creator", "/creator-profile", { method: "POST", data: { ...profile, portfolioUrl: "invalid" }, status: 400 });
  await request("creator", "/creator-profile", { method: "POST", data: { ...profile, published: false }, status: 204 });
  assert.equal((await request("owner", workspace + "/creators?q=film")).creators.length, 0);
  await request("creator", "/creator-profile", { method: "POST", data: profile, status: 204 });
  await request("other", workspace + "/creators?q=film", { status: 404 });
  const { creators } = await request("owner", workspace + "/creators?q=film");
  assert.equal(creators[0].userId, "creator");
  assert.ok(!JSON.stringify(creators).includes("creator@example.test"));
  const { id: campaignId } = await request("owner", workspace + "/campaigns", { method: "POST", data: brief, status: 201 });
  const campaign = workspace + "/campaigns/" + campaignId;
  const offer = { creatorId: creators[0].userId, amountCents: 85000, note: "One 60-second film" };
  await request("owner", campaign + "/offers", { method: "POST", data: offer, status: 409 });
  await request("other", "/workspaces/" + otherWorkspaceId + "/campaigns/" + campaignId + "/status", {
    method: "POST", data: { status: "open" }, status: 404,
  });
  await request("owner", campaign, { method: "PUT", data: { ...brief, title: "Fall " + brief.title } });
  await request("owner", campaign + "/status", { method: "POST", data: { status: "open" }, status: 204 });
  await request("owner", campaign, { method: "PUT", data: brief, status: 409 });
  const competing = await Promise.allSettled([
    request("owner", campaign + "/offers", { method: "POST", data: offer, status: 201 }),
    request("owner", campaign + "/offers", { method: "POST", data: offer, status: 201 }),
  ]);
  assert.equal(competing.filter((item) => item.status === "fulfilled").length, 1);
  const brand = await request("owner", workspace);
  assert.equal(brand.offers.length, 1);
  const { id: offerId } = brand.offers[0];
  const offerPath = "/offers/" + offerId;
  assert.equal((await request("other", "/account")).offers.length, 0);
  assert.equal((await request("creator", "/account")).offers[0].id, offerId);
  await request("owner", campaign + "/status", { method: "POST", data: { status: "closed" }, status: 409 });
  await request("other", offerPath + "/response", { method: "POST", data: { action: "accept" }, status: 404 });
  await request("creator", offerPath + "/response", { method: "POST", data: { action: "accept" }, status: 204 });
  await request("creator", offerPath + "/response", { method: "POST", data: { action: "decline" }, status: 409 });
  await request("creator", offerPath + "/deliverables", { method: "POST", data: { url: "javascript:alert(1)" }, status: 400 });
  await request("creator", offerPath + "/deliverables", { method: "POST", data: { url: "https://example.test/rev1" }, status: 204 });
  const revisionRequest = { revision: 1, decision: "changes_requested", feedback: "Please turn off the background music." };
  await request("other", offerPath + "/review", { method: "POST", data: revisionRequest, status: 404 });
  await request("creator", offerPath + "/review", { method: "POST", data: revisionRequest, status: 404 });
  await request("owner", offerPath + "/review", { method: "POST", data: revisionRequest, status: 204 });
  await request("creator", offerPath + "/deliverables", { method: "POST", data: { url: "https://example.test/rev2", note: "Audio corrected." }, status: 204 });
  await request("owner", offerPath + "/review", { method: "POST", data: { revision: 1, decision: "approved" }, status: 409 });
  await request("owner", offerPath + "/review", { method: "POST", data: { revision: 2, decision: "approved" }, status: 204 });
  await request("owner", campaign + "/status", { method: "POST", data: { status: "closed" }, status: 204 });

  await api.close();
  api = await start(file);
  const saved = await api.request("creator", "/account");
  assert.equal(saved.offers[0].status, "approved");
  assert.equal(saved.offers[0].deliverables.length, 2);
  assert.equal(saved.offers[0].deliverables[0].url, "https://example.test/rev2");
  assert.equal(saved.offers[0].deliverables[1].feedback, revisionRequest.feedback);
  const savedBrand = await api.request("owner", workspace);
  assert.equal(savedBrand.campaigns[0].status, "closed");
  assert.equal(savedBrand.activity[0].kind, "Campaign closed");
});

test("demo-only deployments expose health without enabling private APIs", async (t) => {
  const api = await start(":memory:", false);
  t.after(() => api.close());
  assert.deepEqual(await api.request(null, "/config"), { firebase: null });
  assert.deepEqual(await api.request(null, "/health"), { status: "ready", accounts: "unconfigured" });
  await api.request("owner", "/account", { status: 503 });
});
