"use client";

import * as React from "react";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store/store";

/** Export and deletion of the learner's data (ACC-4, ACC-5). */
export function DataControls() {
  const { state, actions } = useStore();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [scope, setScope] = React.useState<"all" | "texts" | null>(null);
  const [confirm, setConfirm] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);

  const doExport = async () => {
    setBusy("export");
    setMsg(null);
    try {
      const res = await fetch("/api/account/export", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const server = await res.json();
      const blob = new Blob([JSON.stringify({ ...server, browserState: state }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lingua-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMsg("Не удалось подготовить экспорт. Попробуйте ещё раз.");
    } finally {
      setBusy(null);
    }
  };

  const doDelete = async () => {
    if (!scope || confirm !== "УДАЛИТЬ") return;
    setBusy("delete");
    setMsg(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope, confirm }) });
      const data = await res.json();
      if (!res.ok) throw new Error();
      if (scope === "all") {
        actions.resetAll();
        try {
          localStorage.removeItem("lingua:records-queue");
        } catch {
          /* ignore */
        }
        setMsg(data.accountRemoval === "pending" ? "Учебные данные удалены. Сам логин удалит администратор — запрос зарегистрирован." : "Все учебные данные удалены.");
      } else {
        // Writing texts also live in the synced progress — strip them there too.
        actions.redactTexts();
        setMsg("Письменные тексты удалены. Оценки и статистика сохранены.");
      }
      setScope(null);
      setConfirm("");
    } catch {
      setMsg("Не удалось выполнить удаление. Попробуйте ещё раз.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[14px] font-medium text-fg">Экспорт данных</p>
          <p className="text-[12.5px] text-subtle">Всё, что хранится о вас: диагностики, ответы, занятия, повторение, расход AI — одним JSON-файлом.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={doExport} disabled={busy !== null}>
          <Download /> {busy === "export" ? "Готовим…" : "Скачать"}
        </Button>
      </div>
      <div className="border-t border-line pt-4">
        <p className="text-[14px] font-medium text-fg">Удаление данных</p>
        <p className="text-[12.5px] text-subtle">Голосовые записи не хранятся — удалять нечего.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setScope("texts")} aria-pressed={scope === "texts"}>
            Удалить мои тексты
          </Button>
          <Button variant="danger" size="sm" onClick={() => setScope("all")} aria-pressed={scope === "all"}>
            <Trash2 /> Удалить все данные
          </Button>
        </div>
        {scope && (
          <div className="mt-3 rounded-xl border border-danger/30 bg-danger/5 p-4">
            <p className="text-[13.5px] text-fg">
              {scope === "all"
                ? "Будут удалены диагностики, ответы, занятия, повторение, расход AI и синхронизированный прогресс. Это нельзя отменить."
                : "Будут удалены тексты письменных заданий (в диагностике и занятиях). Оценки останутся."}
            </p>
            <p className="mt-2 text-[12.5px] text-muted">Чтобы подтвердить, введите УДАЛИТЬ</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-40" aria-label="Подтверждение" />
              <Button variant="danger" size="sm" onClick={doDelete} disabled={confirm !== "УДАЛИТЬ" || busy !== null}>
                {busy === "delete" ? "Удаляем…" : "Подтвердить"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setScope(null);
                  setConfirm("");
                }}
              >
                Отмена
              </Button>
            </div>
          </div>
        )}
        {msg && <p className="mt-3 text-[13.5px] text-fg">{msg}</p>}
      </div>
    </div>
  );
}
