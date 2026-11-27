import { lazy, Suspense } from "react";

const WorkspaceApp = lazy(() => import("./components/workspace/WorkspaceApp"));
const DemoWorkspace = lazy(() => import("./components/workspace/DemoWorkspace"));

export default function App() {
  const demo = new URLSearchParams(window.location.search).get("demo") === "1";
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#f7f5f3] text-[#221b22]">Opening CollabSphere…</main>}>
      {demo ? <DemoWorkspace /> : <WorkspaceApp />}
    </Suspense>
  );
}
