import { Suspense } from "react";
import Application from "@/components/application";
export default function Home() {
  return (
    <Suspense fallback={<div className="loading">Preparando tu visita…</div>}>
      <Application path={[]} />
    </Suspense>
  );
}
