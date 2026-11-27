import "dotenv/config";
import express from "express";
import { isAbsolute, resolve } from "node:path";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { workspaceApi } from "./server/api";
import { WorkspaceError, WorkspaceStore } from "./server/store";

const production = process.argv.includes("--production") || process.env.NODE_ENV === "production";
const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const projectId = process.env.FIREBASE_PROJECT_ID;
const apiKey = process.env.FIREBASE_API_KEY;
const authDomain = process.env.FIREBASE_AUTH_DOMAIN;
const appId = process.env.FIREBASE_APP_ID;
const dbPath = process.env.COLLABSPHERE_DB_PATH;

if (emulatorHost && (production || !projectId?.startsWith("demo-") || !/^(127\.0\.0\.1|localhost):\d{1,5}$/.test(emulatorHost))) {
  throw new Error("Auth emulator requires a loopback address and a demo- project in development.");
}
if ((projectId || apiKey || authDomain || emulatorHost) && (!projectId || !apiKey || !authDomain)) {
  throw new Error("Set FIREBASE_PROJECT_ID, FIREBASE_API_KEY and FIREBASE_AUTH_DOMAIN together.");
}
if (production && projectId && (!dbPath || !isAbsolute(dbPath))) {
  throw new Error("Production accounts require an absolute COLLABSPHERE_DB_PATH on a durable volume.");
}

const runtimeConfig = projectId && apiKey && authDomain
  ? { projectId, apiKey, authDomain, ...(appId ? { appId } : {}), ...(emulatorHost ? { emulatorUrl: "http://" + emulatorHost } : {}) }
  : null;
const adminAuth = runtimeConfig ? getAuth(getApps()[0] ?? initializeApp({ projectId })) : null;
const verify = adminAuth && (async (token: string) => {
  let claims;
  try {
    claims = await adminAuth.verifyIdToken(token, true);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === "auth/internal-error" || code === "auth/insufficient-permission" || code === "app/invalid-credential") {
      console.error("CollabSphere identity service is unavailable", code);
      throw new WorkspaceError(503, "Sign-in verification is temporarily unavailable.");
    }
    throw new WorkspaceError(401, "Your sign-in has expired. Please sign in again.");
  }
  if (!claims.email_verified || !claims.email) {
    throw new WorkspaceError(403, "Verify your email before opening a workspace.");
  }
  return { uid: claims.uid, email: claims.email.trim().toLowerCase() };
});

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be between 1 and 65535.");
const host = process.env.HOST || (production ? "0.0.0.0" : "127.0.0.1");
const db = new WorkspaceStore(dbPath || (production && !runtimeConfig ? ":memory:" : "data/collabsphere.sqlite"));

const app = express();
app.disable("x-powered-by");
if (production) app.set("env", "production");
app.use((_request, response, next) => {
  response.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  });
  next();
});
app.use("/api", workspaceApi(db, verify, runtimeConfig));

const vite = production ? null : await import("vite").then(({ createServer }) => createServer({
  server: { middlewareMode: true },
  appType: "spa",
}));
if (vite) {
  app.use(vite.middlewares);
} else {
  const dist = resolve("dist");
  app.use(express.static(dist, { index: false }));
  app.get("*", (_req, res) => res.sendFile(resolve(dist, "index.html")));
}

const listener = app.listen(port, host, () => console.log(`CollabSphere on http://${host}:${port}`));
function stop() {
  listener.close(async () => {
    await vite?.close();
    db.close();
  });
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
