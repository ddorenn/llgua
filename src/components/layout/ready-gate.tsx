"use client";

import { useStore } from "@/lib/store/store";
import { Skeleton } from "@/components/ui/skeleton";

/** Shows a skeleton until persisted learner state has loaded (avoids flashing empty data). */
export function ReadyGate({ children }: { children: React.ReactNode }) {
  const { ready } = useStore();
  if (!ready) return <PageSkeleton />;
  return <div className="animate-fade-in">{children}</div>;
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
