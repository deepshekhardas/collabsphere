CREATE TABLE accounts (
  userId TEXT PRIMARY KEY,
  email TEXT NOT NULL
) STRICT;

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
) STRICT;

CREATE TABLE memberships (
  workspaceId TEXT NOT NULL REFERENCES workspaces(id),
  userId TEXT NOT NULL REFERENCES accounts(userId),
  role TEXT NOT NULL CHECK(role IN ('owner', 'editor')),
  PRIMARY KEY (workspaceId, userId)
) STRICT;
CREATE INDEX memberships_by_user ON memberships(userId, workspaceId);
CREATE UNIQUE INDEX workspace_owner ON memberships(workspaceId) WHERE role = 'owner';

CREATE TABLE invites (
  id TEXT PRIMARY KEY,
  tokenHash TEXT NOT NULL UNIQUE,
  workspaceId TEXT NOT NULL REFERENCES workspaces(id),
  email TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  acceptedAt TEXT,
  revokedAt TEXT
) STRICT;
CREATE INDEX invites_by_workspace ON invites(workspaceId, email);

CREATE TABLE creators (
  userId TEXT PRIMARY KEY REFERENCES accounts(userId),
  displayName TEXT NOT NULL,
  niche TEXT NOT NULL,
  bio TEXT NOT NULL,
  portfolioUrl TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL CHECK(published IN (0, 1))
) STRICT;

CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,
  workspaceId TEXT NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  brief TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'open', 'closed')),
  createdAt TEXT NOT NULL
) STRICT;
CREATE INDEX campaigns_by_workspace ON campaigns(workspaceId, createdAt);

CREATE TABLE offers (
  id TEXT PRIMARY KEY,
  campaignId TEXT NOT NULL REFERENCES campaigns(id),
  creatorId TEXT NOT NULL REFERENCES creators(userId),
  amountCents INTEGER NOT NULL CHECK(amountCents > 0),
  note TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('sent', 'accepted', 'declined', 'withdrawn', 'submitted', 'changes_requested', 'approved')),
  createdAt TEXT NOT NULL,
  UNIQUE(campaignId, creatorId)
) STRICT;
CREATE INDEX offers_by_creator ON offers(creatorId, createdAt);

CREATE TABLE deliverables (
  offerId TEXT NOT NULL REFERENCES offers(id),
  revision INTEGER NOT NULL CHECK(revision > 0),
  url TEXT NOT NULL,
  note TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  review TEXT CHECK(review IN ('approved', 'changes_requested')),
  feedback TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (offerId, revision)
) STRICT;

CREATE TABLE activity (
  id TEXT PRIMARY KEY,
  workspaceId TEXT NOT NULL REFERENCES workspaces(id),
  actorId TEXT NOT NULL REFERENCES accounts(userId),
  kind TEXT NOT NULL,
  detail TEXT NOT NULL,
  createdAt TEXT NOT NULL
) STRICT;
CREATE INDEX activity_by_workspace ON activity(workspaceId, createdAt);
