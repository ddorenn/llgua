"use client";

import type { Answer, Intake, PlacementView } from "@/lib/placement/types";

export interface Overview {
  current: PlacementView | null;
  canStart: boolean;
  retestAfter: string | null;
  pilotEarlyRetake: boolean;
  configVersion: string;
}

export class PlacementError extends Error {
  constructor(
    public code: string,
    public overview?: Overview,
  ) {
    super(code);
  }
}

async function call(url: string, init?: RequestInit): Promise<Overview> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" }, cache: "no-store" });
  } catch {
    throw new PlacementError("network");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new PlacementError(data.error ?? `http_${res.status}`, data.overview);
  return data as Overview;
}

export const placementApi = {
  get: () => call("/api/placement"),
  start: (intake: Intake) => call("/api/placement", { method: "POST", body: JSON.stringify({ action: "start", intake }) }),
  abandon: (placementId: string) => call("/api/placement", { method: "POST", body: JSON.stringify({ action: "abandon", placementId }) }),
  answer: (placementId: string, answer: Answer) => call("/api/placement/answer", { method: "POST", body: JSON.stringify({ placementId, answer }) }),
};

export const ERROR_TEXT: Record<string, string> = {
  cyrillic: "Похоже, включена русская раскладка. Переключите клавиатуру на английскую — ответ не засчитан как ошибка.",
  empty: "Введите ответ или нажмите «Не знаю».",
  bad_answer: "Выберите один из вариантов.",
  network: "Нет соединения. Ответ не потерян — попробуйте ещё раз.",
  conflict: "Этот ответ уже сохранён. Показываем актуальное задание.",
  seq_mismatch: "Диагностика открыта в другой вкладке. Показываем актуальное задание.",
  item_mismatch: "Задание сменилось. Показываем актуальное.",
  not_found: "Эта попытка уже завершена или закрыта.",
  retest_too_soon: "Повторная диагностика пока недоступна.",
  db_error: "Не удалось сохранить. Попробуйте ещё раз через минуту.",
  unauthorized: "Сессия истекла — войдите снова.",
};
