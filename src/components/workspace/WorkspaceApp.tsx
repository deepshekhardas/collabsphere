import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  connectAuthEmulator, createUserWithEmailAndPassword, getAuth, GoogleAuthProvider,
  onIdTokenChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword,
  signInWithPopup, signOut, type Auth, type User,
} from "firebase/auth";
import { ArrowUpRight, Check, ClipboardCheck, FileText, Film, LoaderCircle, MoveUpRight } from "lucide-react";
import { WorkspaceShell } from "./WorkspaceShell";
import { Brand, Feedback } from "./ui";
import googleMark from "./google-g.png";
import "./workspace.css";
import "./collaboration-room.css";

type PublicConfig = FirebaseOptions & { emulatorUrl?: string };
const emulatorConnections = new WeakSet<Auth>();

function authInstance(config: PublicConfig) {
  const { emulatorUrl, ...options } = config;
  const name = "collabsphere-workspace";
  const app = getApps().some((entry) => entry.name === name) ? getApp(name) : initializeApp(options, name);
  const auth = getAuth(app);
  if (emulatorUrl && !emulatorConnections.has(auth)) {
    connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
    emulatorConnections.add(auth);
  }
  return auth;
}

function authMessage(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  switch (code) {
    case "auth/email-already-in-use": return "This email already has an account. Try signing in.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found": return "Check your email and password, then try again.";
    case "auth/network-request-failed": return "Couldn't reach the sign-in service. Check your connection.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements": return "Use a stronger password.";
    case "auth/too-many-requests": return "Too many attempts. Wait a moment and try again.";
    case "auth/popup-blocked": return "Allow pop-ups for this site or sign in with email.";
    case "auth/popup-closed-by-user": return "The sign-in window closed. Try again when you're ready.";
    default: return "Couldn't complete that request. Please try again.";
  }
}

function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="cs-app cs-access">
      <header className="cs-access-header">
        <Brand />
        <a href="/?demo=1" className="cs-button cs-secondary">Explore the demo <MoveUpRight size={15} aria-hidden="true" /></a>
      </header>
      <main id="main-content" className="cs-access-body">
        <div className="cs-access-story">
          <div className="cs-eyebrow">For brands and creators</div>
          <h1>Good work starts <em>with a brief.</em></h1>
          <p>Find your creative partner, agree on the work and review every revision in one shared workflow.</p>
          <aside className="cs-access-preview" aria-label="Example collaboration">
            <header><span>Sample campaign</span><span><span aria-hidden="true" /> Ready for review</span></header>
            <h2>Field journal launch</h2>
            <div className="cs-access-stages">
              <div><FileText size={17} aria-hidden="true" /> <span>Brief shared</span><Check size={14} aria-hidden="true" /></div>
              <div><Film size={17} aria-hidden="true" /> <span>Cut delivered</span><Check size={14} aria-hidden="true" /></div>
              <div><ClipboardCheck size={17} aria-hidden="true" /> <span>Brand review</span></div>
            </div>
          </aside>
        </div>
        <div className="cs-access-card">{children}</div>
      </main>
    </div>
  );
}

function AccessForm({ auth }: { auth: Auth }) {
  const [mode, setMode] = useState<"signin" | "register" | "reset">("signin");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  function changeMode(next: typeof mode) {
    setMode(next);
    setError("");
    setStatus("");
  }

  async function action(callback: () => Promise<unknown>, google = false) {
    setBusy(true);
    setGooglePending(google);
    setError("");
    setStatus("");
    try { await callback(); } catch (error) { setError(authMessage(error)); }
    finally { setBusy(false); setGooglePending(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email"));
    const password = String(fields.get("password") || "");
    void action(async () => {
      if (mode === "reset") {
        try { await sendPasswordResetEmail(auth, email); } catch (reason) {
          if (!(reason && typeof reason === "object" && "code" in reason && reason.code === "auth/user-not-found")) throw reason;
        }
        setStatus("If an account exists for that address, a password reset link is on its way.");
      } else if (mode === "register") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(credential.user);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    });
  }

  return (
    <>
      <h2>{mode === "reset" ? "Reset your password" : mode === "register" ? "Create your account" : "Sign in to CollabSphere"}</h2>
      <p>{mode === "reset" ? "Enter the email linked to your account." : "Sign in to your brand or creator workspace."}</p>
      {mode !== "reset" && (
        <>
          <button className="cs-button cs-google" disabled={busy} onClick={() => void action(() => signInWithPopup(auth, new GoogleAuthProvider()), true)}>
            {googlePending ? <LoaderCircle size={18} className="cs-spinner" aria-hidden="true" /> : <img src={googleMark} width="18" height="18" alt="" />}
            {googlePending ? "Connecting to Google…" : "Continue with Google"}
          </button>
          <div className="cs-auth-divider"><span>or use your email</span></div>
        </>
      )}
      <Feedback error>{error}</Feedback>
      <Feedback>{status}</Feedback>
      <form onSubmit={submit} className="cs-stack">
        <label>Email address<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
        {mode !== "reset" && <label>Password<input name="password" type="password" minLength={mode === "register" ? 10 : undefined} maxLength={256} required autoComplete={mode === "register" ? "new-password" : "current-password"} /></label>}
        {mode === "register" && <small>Use at least 10 characters. You’ll verify your email before entering.</small>}
        <button className="cs-button cs-primary" disabled={busy}>
          {busy && !googlePending ? "Please wait…" : mode === "reset" ? "Send reset link" : mode === "register" ? "Create account" : "Sign in with email"}
          <ArrowUpRight size={17} aria-hidden="true" />
        </button>
      </form>
      <div className="cs-access-switch">
        {mode === "signin" ? (
          <>
            <button disabled={busy} onClick={() => changeMode("register")}>Create an account</button>
            <button disabled={busy} onClick={() => changeMode("reset")}>Forgot password?</button>
          </>
        ) : <button disabled={busy} onClick={() => changeMode("signin")}>Back to sign in</button>}
      </div>
    </>
  );
}

function VerifyScreen({ auth, user, onVerified }: { auth: Auth; user: User; onVerified: () => void }) {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function verify(resend: boolean) {
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      if (resend) {
        await sendEmailVerification(user);
        setFeedback("Verification email sent.");
      } else {
        await user.reload();
        if (user.emailVerified) {
          await user.getIdToken(true);
          onVerified();
        } else setError("Your email isn’t verified yet. Open the link in your inbox and try again.");
      }
    } catch (error) {
      setError(authMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Verify your email</h2>
      <p>Open the verification email for <strong>{user.email}</strong>, then return here to continue.</p>
      <div className="cs-stack">
        <Feedback error>{error}</Feedback>
        <Feedback>{feedback}</Feedback>
        <button className="cs-button cs-primary" disabled={busy} onClick={() => void verify(false)}>I’ve verified my email</button>
        <button className="cs-button cs-secondary" disabled={busy} onClick={() => void verify(true)}>Resend verification email</button>
        <button className="cs-button cs-quiet" disabled={busy} onClick={() => void signOut(auth).catch((error) => setError(authMessage(error)))}>Use a different account</button>
      </div>
    </>
  );
}

export default function WorkspaceApp() {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let unsubscribe: (() => void) | undefined;
    fetch("/api/config", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("Configuration unavailable");
        return await response.json() as { firebase: PublicConfig | null };
      })
      .then(({ firebase }) => {
        if (controller.signal.aborted) return;
        if (!firebase) { setLoading(false); return; }
        const instance = authInstance(firebase);
        setAuth(instance);
        unsubscribe = onIdTokenChanged(instance, (active) => {
          setUser(active);
          setVerified(Boolean(active?.emailVerified));
          setLoading(false);
        }, () => { setFailed(true); setLoading(false); });
      })
      .catch(() => {
        if (!controller.signal.aborted) { setFailed(true); setLoading(false); }
      });
    return () => {
      controller.abort();
      unsubscribe?.();
    };
  }, []);

  if (!loading && auth && user && verified && !failed) {
    return <WorkspaceShell key={user.uid} user={user} signOut={() => signOut(auth)} />;
  }
  return (
    <AuthFrame>
      {loading ? <><h2>Opening CollabSphere</h2><p role="status"><LoaderCircle className="cs-spinner" size={19} aria-hidden="true" /> Checking sign-in…</p></>
        : failed ? <><h2>Sign-in is unavailable</h2><p>Reload to retry the connection.</p><button className="cs-button cs-secondary" onClick={() => window.location.reload()}>Reload page</button></>
        : !auth ? <><h2>Explore a sample workspace</h2><p>Account access isn’t configured on this deployment. The demo includes sample creators and campaign drafts.</p><a className="cs-button cs-primary" href="/?demo=1">Open the demo <ArrowUpRight size={17} aria-hidden="true" /></a></>
        : user ? <VerifyScreen auth={auth} user={user} onVerified={() => setVerified(true)} />
        : <AccessForm auth={auth} />}
    </AuthFrame>
  );
}
