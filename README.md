# CollabSphere

CollabSphere is a workspace for brands and independent creators. Brand teams prepare a campaign brief, send a creator an offer, then approve a deliverable or request another revision. Creators publish a discovery profile when they choose and manage offers in their own workspace.

[Existing public demo](https://ais-pre-q2znzekaeaddxbreuhpowj-357091713250.asia-southeast1.run.app/?demo=1) · [Portfolio](https://deepshekhar-builds.deepshekhar.chatgpt.site)

## Workflows

- **Account:** Google or email/password sign-in, email verification and password reset through Firebase Authentication. A single account can join brand teams and manage a creator profile.
- **Brand:** Create a workspace, invite teammates with verified-email-bound links, and control editor access. Draft and open a campaign, find an opted-in creator, agree on a proposed USD fee, and review revisions. The team sees a log of recent workspace activity.
- **Creator:** Choose whether to publish your discovery profile, accept or decline an offer, submit an HTTPS deliverable link, and see feedback and revision history.
- **Demo:** Open `/?demo=1` for the isolated sample workspace. It uses synthetic profiles and browser-local state and works without Firebase.

Project fees are recorded for coordination. The application does not charge customers, pay creators, send external collaboration notifications, or generate legal contracts. The application uses a new SQLite data model. Legacy prototype data in Firestore is outside this instance.

## Install and start a clean checkout

Use Node.js 24 and npm. Node 24.11.0 was used for local validation.

```sh
npm ci
npm run lint
npm test
npm run build
npm run dev
```

Open `http://127.0.0.1:3000/?demo=1` for the demo. Open `http://127.0.0.1:3000/` for the account entry point. The account page explains when sign-in is unconfigured.

## Test local sign-in

1. Start only the Firebase Authentication Emulator in a separate terminal.

   ```sh
   npm exec --yes --package firebase-tools@15.37.0 -- firebase emulators:start --only auth --project demo-collabsphere
   ```

2. Copy `.env.example` to `.env`. Set the identity values below. Keep the default database path for persistent development, or use `:memory:` for a disposable run.

   ```dotenv
   FIREBASE_PROJECT_ID=demo-collabsphere
   FIREBASE_API_KEY=local-emulator-key
   FIREBASE_AUTH_DOMAIN=demo-collabsphere.firebaseapp.com
   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   COLLABSPHERE_DB_PATH=data/collabsphere.sqlite
   ```

3. Run `npm run dev`. Open the account entry point, create an emulator email/password account, then follow the verification link printed by the emulator. Use `npm run test:auth` for an automated run with two disposable users. The smoke script will only use loopback addresses. Restart the emulator to clear the local identities.

`npm test` exercises the real HTTP server and SQLite with controlled identity fixtures. `npm run test:auth` uses actual Firebase Emulator-issued tokens and verifies Google identity, invalid-token rejection, email verification, tenant isolation and a brand-to-creator approval.

## Production setup

1. Use a dedicated Firebase project. Under Authentication, enable Google and Email/Password, add the application domain to the authorized domains list, and set the password policy to match the sign-up form. Use Firebase's verification and password reset templates. Record the web app's project ID, API key, auth domain and optional app ID. [Google sign-in setup](https://firebase.google.com/docs/auth/web/google-signin)
2. Set `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN` and optionally `FIREBASE_APP_ID` on the application server. Configure Application Default Credentials with access to verify Firebase users and revocation status in that project. Keep the service identity on the server. The web app configuration is public and the server API verifies each Firebase bearer token independently. Do not set `FIREBASE_AUTH_EMULATOR_HOST` in production.
3. Use one Node.js process or container with a durable local volume. Set `COLLABSPHERE_DB_PATH` to an absolute SQLite file path on that volume. The server creates the database and applies the versioned migration on startup. SQLite runs with foreign keys enabled and WAL journaling. Configure HTTPS at the ingress and forward health checks to `/api/health`.
4. Use `npm ci && npm run build && npm start` or build a container with `docker build -t collabsphere .`. The container uses port 3000, runs as a non-root user, and expects durable storage at `/data`. Keep the database volume in backup and restore drills. Stop writes before volume copies or take a consistent snapshot through SQLite's backup operation.
5. Check production Google sign-in, verification and password reset delivery, access isolation in separate sessions, approval flow, and persistence after replacing the application process. Configure monitoring, backups and retention before real account data is collected.

The Auth SDK checks signatures, project, expiration, revoked sessions, and verified email. The application API enforces brand workspace membership and creator-owned records, with one-time invites tied to a verified email. The backend serves the browser build and API from one origin. Client Firestore access is denied by the supplied rules because this application uses Firebase for identity only.

## Source

- `src/components/workspace/` contains the account, brand and creator screens.
- `server/api.ts` validates authenticated API requests.
- `server/store.ts` enforces scopes and state transitions against SQLite.
- `server/migrations/` holds database migrations.
- `tests/` contains repeatable API, persistence and Auth Emulator checks.
- The sign-in button uses the official Google mark. [Google Identity branding guidelines](https://developers.google.com/identity/branding-guidelines)

The existing public demo URL is a portfolio example. This branch adds the SaaS source and a self-hostable package. It does not configure a live hosting account or deploy a production identity project.
