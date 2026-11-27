import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  AccountWorkspace, BrandWorkspace, Campaign, CreatorProfile, Deliverable,
  Offer, OfferStatus, PendingInvite, Workspace, WorkspaceActivity, WorkspaceMember,
} from "../src/types/workspace";

export class WorkspaceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type Identity = { uid: string; email: string };
type Value = string | number | null;
type CreatorRow = Omit<CreatorProfile, "published"> & { published: 0 | 1 };
type OfferRow = Omit<Offer, "deliverables" | "viewerIsCreator"> & { creatorId: string };
type OfferAccess = { workspaceId: string; campaignTitle: string; creatorId: string; status: OfferStatus };

const timestamp = () => new Date().toISOString();
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const hidden = () => new WorkspaceError(404, "This record was not found.");
const conflict = (message: string) => new WorkspaceError(409, message);
const offerFields = `
  o.id, o.campaignId, c.title AS campaignTitle, c.brief, w.name AS workspaceName,
  p.displayName AS creatorName, o.creatorId, o.amountCents, o.note, o.status, o.createdAt
  FROM offers o
  JOIN campaigns c ON c.id = o.campaignId
  JOIN workspaces w ON w.id = c.workspaceId
  JOIN creators p ON p.userId = o.creatorId
`;

export class WorkspaceStore {
  private db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path, { enableForeignKeyConstraints: true });
    this.db.exec("PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;");
    this.transaction(() => {
      const { user_version } = this.get<{ user_version: number }>("PRAGMA user_version")!;
      if (user_version > 1) throw new Error("This CollabSphere database needs a newer server.");
      if (user_version === 0) {
        this.db.exec(readFileSync(new URL("./migrations/001.sql", import.meta.url), "utf8"));
        this.db.exec("PRAGMA user_version = 1");
      }
    });
  }

  close() {
    this.db.close();
  }

  private get<T>(sql: string, ...args: Value[]) {
    return this.db.prepare(sql).get(...args) as T | undefined;
  }

  private all<T>(sql: string, ...args: Value[]) {
    return this.db.prepare(sql).all(...args) as T[];
  }

  private run(sql: string, ...args: Value[]) {
    return this.db.prepare(sql).run(...args);
  }

  private transaction<T>(write: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = write();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  private requireWorkspace(uid: string, id: string, ownerOnly = false) {
    const workspace = this.get<Workspace>(
      "SELECT w.id, w.name, m.role FROM workspaces w JOIN memberships m ON w.id = m.workspaceId WHERE w.id = ? AND m.userId = ?",
      id, uid,
    );
    if (!workspace) throw hidden();
    if (ownerOnly && workspace.role !== "owner") throw new WorkspaceError(403, "Only the workspace owner can manage access.");
    return workspace;
  }

  private addActivity(uid: string, workspaceId: string, kind: string, detail: string) {
    this.run("INSERT INTO activity VALUES (?, ?, ?, ?, ?, ?)", randomUUID(), workspaceId, uid, kind, detail, timestamp());
  }

  private withDeliverables(rows: OfferRow[], uid: string): Offer[] {
    return rows.map(({ creatorId, ...row }) => ({
      ...row,
      viewerIsCreator: creatorId === uid,
      deliverables: this.all<Deliverable>(
        "SELECT revision, url, note, createdAt, review, feedback FROM deliverables WHERE offerId = ? ORDER BY revision DESC",
        row.id,
      ),
    }));
  }

  register({ uid, email }: Identity) {
    const current = this.get<{ email: string }>("SELECT email FROM accounts WHERE userId = ?", uid);
    if (current?.email !== email) {
      this.run("INSERT INTO accounts VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET email = excluded.email", uid, email);
    }
  }

  account({ uid, email }: Identity): AccountWorkspace {
    const creator = this.get<CreatorRow>("SELECT * FROM creators WHERE userId = ?", uid);
    return {
      account: { email },
      workspaces: this.all<Workspace>(
        "SELECT w.id, w.name, m.role FROM workspaces w JOIN memberships m ON w.id = m.workspaceId WHERE m.userId = ? ORDER BY w.name, w.id",
        uid,
      ),
      creator: creator ? { ...creator, published: Boolean(creator.published) } : null,
      offers: this.withDeliverables(this.all<OfferRow>(`SELECT ${offerFields} WHERE o.creatorId = ? ORDER BY o.createdAt DESC, o.id`, uid), uid),
    };
  }

  createWorkspace(uid: string, name: string) {
    return this.transaction(() => {
      const id = randomUUID();
      this.run("INSERT INTO workspaces VALUES (?, ?)", id, name);
      this.run("INSERT INTO memberships VALUES (?, ?, 'owner')", id, uid);
      this.addActivity(uid, id, "Workspace created", name);
      return { id };
    });
  }

  brand(uid: string, id: string): BrandWorkspace {
    const workspace = this.requireWorkspace(uid, id);
    return {
      workspace,
      campaigns: this.all<Campaign>(
        "SELECT id, title, brief, status, createdAt FROM campaigns WHERE workspaceId = ? ORDER BY createdAt DESC, id", id,
      ),
      offers: this.withDeliverables(this.all<OfferRow>(`SELECT ${offerFields} WHERE c.workspaceId = ? ORDER BY o.createdAt DESC, o.id`, id), uid),
      members: this.all<WorkspaceMember>(
        "SELECT a.userId, a.email, m.role FROM accounts a JOIN memberships m ON a.userId = m.userId WHERE m.workspaceId = ? ORDER BY m.role DESC, a.email", id,
      ),
      pendingInvites: workspace.role === "owner"
        ? this.all<PendingInvite>(
          "SELECT id, email, expiresAt FROM invites WHERE workspaceId = ? AND acceptedAt IS NULL AND revokedAt IS NULL AND expiresAt > ? ORDER BY expiresAt DESC",
          id, timestamp(),
        ) : [],
      activity: this.all<WorkspaceActivity>(
        "SELECT id, kind, detail, createdAt FROM activity WHERE workspaceId = ? ORDER BY createdAt DESC, rowid DESC LIMIT 25", id,
      ),
    };
  }

  invite(uid: string, workspaceId: string, email: string) {
    return this.transaction(() => {
      this.requireWorkspace(uid, workspaceId, true);
      const member = this.get(
        "SELECT 1 FROM memberships m JOIN accounts a ON m.userId = a.userId WHERE m.workspaceId = ? AND a.email = ?", workspaceId, email,
      );
      if (member) throw conflict("This email already belongs to the workspace.");
      const now = timestamp();
      this.run("UPDATE invites SET revokedAt = ? WHERE workspaceId = ? AND email = ? AND acceptedAt IS NULL AND revokedAt IS NULL", now, workspaceId, email);
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      this.run("INSERT INTO invites (id, tokenHash, workspaceId, email, expiresAt) VALUES (?, ?, ?, ?, ?)", randomUUID(), hash(token), workspaceId, email, expiresAt);
      this.addActivity(uid, workspaceId, "Team invite created", email);
      return { token, expiresAt };
    });
  }

  acceptInvite({ uid, email }: Identity, token: string) {
    return this.transaction(() => {
      const now = timestamp();
      const invite = this.get<{ id: string; workspaceId: string }>(
        "SELECT id, workspaceId FROM invites WHERE tokenHash = ? AND email = ? AND expiresAt > ? AND acceptedAt IS NULL AND revokedAt IS NULL", hash(token), email, now,
      );
      if (!invite) throw new WorkspaceError(404, "This invite is unavailable for your verified email.");
      this.run("UPDATE invites SET acceptedAt = ? WHERE id = ?", now, invite.id);
      this.run("INSERT INTO memberships VALUES (?, ?, 'editor') ON CONFLICT(workspaceId, userId) DO NOTHING", invite.workspaceId, uid);
      this.addActivity(uid, invite.workspaceId, "Team invite accepted", email);
      return { id: invite.workspaceId };
    });
  }

  revokeInvite(uid: string, workspaceId: string, id: string) {
    this.transaction(() => {
      this.requireWorkspace(uid, workspaceId, true);
      const invite = this.get<{ email: string }>(
        "UPDATE invites SET revokedAt = ? WHERE id = ? AND workspaceId = ? AND acceptedAt IS NULL AND revokedAt IS NULL AND expiresAt > ? RETURNING email",
        timestamp(), id, workspaceId, timestamp(),
      );
      if (!invite) throw hidden();
      this.addActivity(uid, workspaceId, "Team invite revoked", invite.email);
    });
  }

  removeMember(uid: string, workspaceId: string, memberId: string) {
    this.transaction(() => {
      this.requireWorkspace(uid, workspaceId, true);
      const member = this.get<{ email: string }>("SELECT email FROM accounts WHERE userId = ?", memberId);
      const changed = this.run("DELETE FROM memberships WHERE workspaceId = ? AND userId = ? AND role = 'editor'", workspaceId, memberId);
      if (!changed.changes || !member) throw hidden();
      this.addActivity(uid, workspaceId, "Team member removed", member.email);
    });
  }

  saveCreator(uid: string, profile: Omit<CreatorProfile, "userId">) {
    this.run(`INSERT INTO creators VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(userId) DO UPDATE SET displayName = excluded.displayName, niche = excluded.niche, bio = excluded.bio, portfolioUrl = excluded.portfolioUrl, published = excluded.published`,
      uid, profile.displayName, profile.niche, profile.bio, profile.portfolioUrl, Number(profile.published));
  }

  searchCreators(uid: string, workspaceId: string, search: string, offset: number) {
    this.requireWorkspace(uid, workspaceId);
    const rows = this.all<CreatorRow>(
      `SELECT p.* FROM creators p WHERE p.published = 1
        AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.workspaceId = ? AND m.userId = p.userId)
        AND instr(lower(p.displayName || ' ' || p.niche), lower(?)) > 0
        ORDER BY p.displayName COLLATE NOCASE, p.userId LIMIT 21 OFFSET ?`,
      workspaceId, search, offset,
    );
    return {
      creators: rows.slice(0, 20).map((row) => ({ ...row, published: true })),
      hasMore: rows.length > 20,
    };
  }

  saveCampaign(uid: string, workspaceId: string, draft: Pick<Campaign, "title" | "brief">, id?: string) {
    return this.transaction(() => {
      this.requireWorkspace(uid, workspaceId);
      if (!id) {
        const campaignId = randomUUID();
        this.run("INSERT INTO campaigns (id, workspaceId, title, brief, createdAt) VALUES (?, ?, ?, ?, ?)", campaignId, workspaceId, draft.title, draft.brief, timestamp());
        this.addActivity(uid, workspaceId, "Campaign drafted", draft.title);
        return { id: campaignId };
      }
      const campaign = this.get<Campaign>("SELECT title, status FROM campaigns WHERE id = ? AND workspaceId = ?", id, workspaceId);
      if (!campaign) throw hidden();
      if (campaign.status !== "draft") throw conflict("Only a draft can be edited.");
      this.run("UPDATE campaigns SET title = ?, brief = ? WHERE id = ?", draft.title, draft.brief, id);
      this.addActivity(uid, workspaceId, "Campaign updated", draft.title);
      return { id };
    });
  }

  changeCampaign(uid: string, workspaceId: string, id: string, status: "open" | "closed") {
    this.transaction(() => {
      this.requireWorkspace(uid, workspaceId);
      const campaign = this.get<Campaign>("SELECT title, status FROM campaigns WHERE id = ? AND workspaceId = ?", id, workspaceId);
      if (!campaign) throw hidden();
      if ((status === "open" && campaign.status !== "draft") || (status === "closed" && campaign.status === "closed")) {
        throw conflict("This campaign changed. Refresh the workspace.");
      }
      if (status === "closed" && this.get("SELECT 1 FROM offers WHERE campaignId = ? AND status NOT IN ('approved', 'declined', 'withdrawn')", id)) {
        throw conflict("Finish active collaborations before closing the campaign.");
      }
      this.run("UPDATE campaigns SET status = ? WHERE id = ?", status, id);
      this.addActivity(uid, workspaceId, status === "open" ? "Campaign opened" : "Campaign closed", campaign.title);
    });
  }

  createOffer(uid: string, workspaceId: string, campaignId: string, creatorId: string, amountCents: number, note: string) {
    return this.transaction(() => {
      this.requireWorkspace(uid, workspaceId);
      const campaign = this.get<Campaign>("SELECT title, status FROM campaigns WHERE id = ? AND workspaceId = ?", campaignId, workspaceId);
      if (!campaign) throw hidden();
      if (campaign.status !== "open") throw conflict("Open the campaign before sending offers.");
      const creator = this.get<CreatorRow>("SELECT * FROM creators WHERE userId = ? AND published = 1", creatorId);
      if (!creator || this.get("SELECT 1 FROM memberships WHERE workspaceId = ? AND userId = ?", workspaceId, creatorId)) throw hidden();
      if (this.get("SELECT 1 FROM offers WHERE campaignId = ? AND creatorId = ?", campaignId, creatorId)) {
        throw conflict("This creator already has an offer for the campaign.");
      }
      const id = randomUUID();
      this.run("INSERT INTO offers (id, campaignId, creatorId, amountCents, note, createdAt) VALUES (?, ?, ?, ?, ?, ?)", id, campaignId, creatorId, amountCents, note, timestamp());
      this.addActivity(uid, workspaceId, "Offer sent", `${campaign.title} · ${creator.displayName}`);
      return { id };
    });
  }

  changeOffer(uid: string, id: string, action: "accept" | "decline" | "withdraw") {
    this.transaction(() => {
      const offer = this.offerAccess(id);
      if (action === "withdraw") this.requireIndependentReviewer(uid, offer);
      else if (offer.creatorId !== uid) throw hidden();
      if (offer.status !== "sent") throw conflict("This offer has already been answered or withdrawn.");
      const status = { accept: "accepted", decline: "declined", withdraw: "withdrawn" }[action];
      this.run("UPDATE offers SET status = ? WHERE id = ?", status, id);
      this.addActivity(uid, offer.workspaceId, `Offer ${status}`, offer.campaignTitle);
    });
  }

  submitDeliverable(uid: string, id: string, url: string, note: string) {
    this.transaction(() => {
      const offer = this.offerAccess(id);
      if (offer.creatorId !== uid) throw hidden();
      if (offer.status !== "accepted" && offer.status !== "changes_requested") throw conflict("This offer is not awaiting a deliverable.");
      this.run(`INSERT INTO deliverables (offerId, revision, url, note, createdAt)
        SELECT ?, COALESCE(MAX(revision), 0) + 1, ?, ?, ? FROM deliverables WHERE offerId = ?`, id, url, note, timestamp(), id);
      this.run("UPDATE offers SET status = 'submitted' WHERE id = ?", id);
      this.addActivity(uid, offer.workspaceId, "Deliverable submitted", offer.campaignTitle);
    });
  }

  review(uid: string, id: string, revision: number, decision: "approved" | "changes_requested", feedback: string) {
    this.transaction(() => {
      const offer = this.offerAccess(id);
      this.requireIndependentReviewer(uid, offer);
      if (offer.status !== "submitted") throw conflict("This offer is not awaiting review.");
      const changed = this.run("UPDATE deliverables SET review = ?, feedback = ? WHERE offerId = ? AND revision = ? AND review IS NULL", decision, feedback, id, revision);
      if (!changed.changes) throw conflict("The deliverable changed. Review the latest revision.");
      this.run("UPDATE offers SET status = ? WHERE id = ?", decision, id);
      this.addActivity(uid, offer.workspaceId, decision === "approved" ? "Deliverable approved" : "Changes requested", offer.campaignTitle);
    });
  }

  private offerAccess(id: string) {
    const offer = this.get<OfferAccess>(
      "SELECT c.workspaceId, c.title AS campaignTitle, o.creatorId, o.status FROM offers o JOIN campaigns c ON c.id = o.campaignId WHERE o.id = ?", id,
    );
    if (!offer) throw hidden();
    return offer;
  }

  private requireIndependentReviewer(uid: string, offer: OfferAccess) {
    this.requireWorkspace(uid, offer.workspaceId);
    if (offer.creatorId === uid) {
      throw new WorkspaceError(403, "Another team member must act on behalf of the brand for your offer.");
    }
  }
}
