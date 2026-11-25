"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border border-line bg-card p-8 text-center">
      <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-md border border-danger/30 bg-danger/10 text-danger">
        <AlertTriangle className="size-5" />
      </div>
      <h1 className="text-lg font-semibold">Что-то пошло не так</h1>
      <p className="mt-1.5 text-sm text-muted">Страница не загрузилась. Сохранённый прогресс не пострадал.</p>
      {error.digest && <p className="mt-2 font-mono text-[11px] text-subtle">ref: {error.digest}</p>}
      <Button className="mt-5" onClick={reset}>Попробовать снова</Button>
    </div>
  );
}
