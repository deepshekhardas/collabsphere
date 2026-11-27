import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { WorkspaceError, WorkspaceStore, type Identity } from "./store";

type VerifyIdentity = (token: string) => Promise<Identity>;
type FirebasePublicConfig = { apiKey: string; authDomain: string; projectId: string; appId?: string; emulatorUrl?: string };

const id = z.string().uuid();
const userId = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const email = z.string().trim().toLowerCase().max(254).email("Enter a valid email address.");
const name = z.string().trim().min(2).max(100);
const campaign = z.object({ title: z.string().trim().min(3).max(120), brief: z.string().trim().min(20).max(6000) });
const httpsUrl = z.string().trim().max(2048).refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Use an HTTPS URL without login credentials.");

export function workspaceApi(
  store: WorkspaceStore,
  verify: VerifyIdentity | null,
  config: FirebasePublicConfig | null,
) {
  const router = express.Router();
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.get("/health", (_req, res) => {
    res.json({ status: "ready", accounts: verify ? "enabled" : "unconfigured" });
  });
  router.get("/config", (_req, res) => res.json({ firebase: config }));

  router.use(async (req, res, next) => {
    if (!verify) { next(new WorkspaceError(503, "Account sign-in is not configured.")); return; }
    const match = req.get("authorization")?.match(/^Bearer ([A-Za-z0-9_.-]{20,8192})$/i);
    if (!match) { next(new WorkspaceError(401, "Sign in to access your workspace.")); return; }
    try {
      res.locals.identity = await verify(match[1]);
    } catch (error) {
      next(error instanceof WorkspaceError ? error : new WorkspaceError(401, "Your sign-in has expired. Please sign in again."));
      return;
    }
    next();
  });
  router.use(express.json({ limit: "24kb" }));

  function handle(run: (req: Request, res: Response, actor: Identity) => void) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const actor = res.locals.identity as Identity;
        store.register(actor);
        run(req, res, actor);
      } catch (error) {
        next(error);
      }
    };
  }

  router.get("/account", handle((_req, res, actor) => res.json(store.account(actor))));
  router.post("/creator-profile", handle((req, res, actor) => {
    const profile = z.object({
      displayName: name,
      niche: z.string().trim().min(2).max(100),
      bio: z.string().trim().min(10).max(1200),
      portfolioUrl: z.union([z.literal(""), httpsUrl]),
      published: z.boolean(),
    }).parse(req.body);
    store.saveCreator(actor.uid, { ...profile, portfolioUrl: profile.portfolioUrl ?? "" });
    res.sendStatus(204);
  }));
  router.post("/workspaces", handle((req, res, actor) => {
    res.status(201).json(store.createWorkspace(actor.uid, name.parse(req.body?.name)));
  }));
  router.get("/workspaces/:workspaceId", handle((req, res, actor) => {
    res.json(store.brand(actor.uid, id.parse(req.params.workspaceId)));
  }));
  router.post("/workspaces/:workspaceId/invites", handle((req, res, actor) => {
    res.status(201).json(store.invite(actor.uid, id.parse(req.params.workspaceId), email.parse(req.body?.email)));
  }));
  router.post("/invites/accept", handle((req, res, actor) => {
    const token = z.string().regex(/^[A-Za-z0-9_-]{43}$/).parse(req.body?.token);
    res.json(store.acceptInvite(actor, token));
  }));
  router.delete("/workspaces/:workspaceId/invites/:inviteId", handle((req, res, actor) => {
    store.revokeInvite(actor.uid, id.parse(req.params.workspaceId), id.parse(req.params.inviteId));
    res.sendStatus(204);
  }));
  router.delete("/workspaces/:workspaceId/members/:memberId", handle((req, res, actor) => {
    store.removeMember(actor.uid, id.parse(req.params.workspaceId), userId.parse(req.params.memberId));
    res.sendStatus(204);
  }));
  router.get("/workspaces/:workspaceId/creators", handle((req, res, actor) => {
    const query = z.object({
      q: z.string().trim().max(100).default(""),
      offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
    }).parse(req.query);
    res.json(store.searchCreators(actor.uid, id.parse(req.params.workspaceId), query.q, query.offset));
  }));
  router.post("/workspaces/:workspaceId/campaigns", handle((req, res, actor) => {
    res.status(201).json(store.saveCampaign(actor.uid, id.parse(req.params.workspaceId), campaign.parse(req.body)));
  }));
  router.put("/workspaces/:workspaceId/campaigns/:campaignId", handle((req, res, actor) => {
    res.json(store.saveCampaign(actor.uid, id.parse(req.params.workspaceId), campaign.parse(req.body), id.parse(req.params.campaignId)));
  }));
  router.post("/workspaces/:workspaceId/campaigns/:campaignId/status", handle((req, res, actor) => {
    const status = z.enum(["open", "closed"]).parse(req.body?.status);
    store.changeCampaign(actor.uid, id.parse(req.params.workspaceId), id.parse(req.params.campaignId), status);
    res.sendStatus(204);
  }));
  router.post("/workspaces/:workspaceId/campaigns/:campaignId/offers", handle((req, res, actor) => {
    const offer = z.object({
      creatorId: userId,
      amountCents: z.number().int().min(1).max(100_000_000),
      note: z.string().trim().max(1200).default(""),
    }).parse(req.body);
    res.status(201).json(store.createOffer(
      actor.uid, id.parse(req.params.workspaceId), id.parse(req.params.campaignId), offer.creatorId, offer.amountCents, offer.note,
    ));
  }));
  router.post("/offers/:offerId/response", handle((req, res, actor) => {
    const action = z.enum(["accept", "decline", "withdraw"]).parse(req.body?.action);
    store.changeOffer(actor.uid, id.parse(req.params.offerId), action);
    res.sendStatus(204);
  }));
  router.post("/offers/:offerId/deliverables", handle((req, res, actor) => {
    const deliverable = z.object({ url: httpsUrl, note: z.string().trim().max(3000).default("") }).parse(req.body);
    store.submitDeliverable(actor.uid, id.parse(req.params.offerId), deliverable.url, deliverable.note);
    res.sendStatus(204);
  }));
  router.post("/offers/:offerId/review", handle((req, res, actor) => {
    const review = z.object({
      revision: z.number().int().positive(),
      decision: z.enum(["approved", "changes_requested"]),
      feedback: z.string().trim().max(3000).default(""),
    }).refine((value) => value.decision !== "changes_requested" || value.feedback.length > 0, "Include feedback when requesting changes.").parse(req.body);
    store.review(actor.uid, id.parse(req.params.offerId), review.revision, review.decision, review.feedback);
    res.sendStatus(204);
  }));

  router.use((_req, _res, next) => next(new WorkspaceError(404, "This endpoint was not found.")));
  router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof WorkspaceError) {
      res.status(error.status).json({ error: error.message });
    } else if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? "Check your input and try again." });
    } else if (error instanceof Error && "status" in error && (error.status === 400 || error.status === 413)) {
      res.status(error.status).json({ error: error.status === 413 ? "This request is too large." : "This request is invalid." });
    } else {
      console.error("CollabSphere API request failed", error instanceof Error ? error.name : "UnexpectedError");
      res.status(500).json({ error: "The workspace couldn't complete this request. Try again." });
    }
  });
  return router;
}
