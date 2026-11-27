import type { ReactNode } from "react";
import { CircleAlert, Layers3 } from "lucide-react";

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
