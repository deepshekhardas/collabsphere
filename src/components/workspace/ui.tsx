import type { ReactNode } from "react";
import { CircleAlert, Layers3, LoaderCircle } from "lucide-react";

export function Brand() {
  return (
    <a className="cs-brand" href="/" aria-label="CollabSphere home">
      <span className="cs-brand-icon"><Layers3 size={19} strokeWidth={2.4} /></span>
      <span>Collab<span className="cs-brand-muted">Sphere</span></span>
    </a>
  );
}

export function Feedback({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return children ? (
    <div className={error ? "cs-feedback is-error" : "cs-feedback"} role={error ? "alert" : "status"}>
      {error && <CircleAlert size={17} aria-hidden="true" />}
      <span>{children}</span>
    </div>
  ) : null;
}

export function FocusCard({ label, title, children, action, tone = "brand" }: {
  label: string; title: string; children: ReactNode; action?: ReactNode; tone?: "brand" | "creator";
}) {
  return (
    <section className={"cs-focus-card cs-focus-" + tone} aria-label="Next action">
      <div>
        <p className="cs-focus-label">{label}</p>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
      {action && <div className="cs-focus-action">{action}</div>}
    </section>
  );
}

export function LoadingWorkspace({ label }: { label: string }) {
  return (
    <div className="cs-loading" role="status">
      <div><LoaderCircle className="cs-spinner" size={18} aria-hidden="true" /> {label}</div>
      <span aria-hidden="true" /><span aria-hidden="true" />
    </div>
  );
}

export function focusSection(id: string) {
  requestAnimationFrame(() => {
    const element = document.getElementById(id);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "start" });
  });
}
