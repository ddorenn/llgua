/**
 * Assessment scoring. Deliberately simple and transparent: raw correct/total per skill.
 * It does NOT estimate a CEFR level. A validated scoring model can replace `gradeAssessment`
 * later without changing the UI (it only consumes AssessmentResult).
 */
import type { Assessment, AssessmentQuestion } from "@/lib/content";
import type { AssessmentResult } from "@/lib/store/types";
import { uid } from "@/lib/utils";

export type AnswerValue = number | string;

function normalise(s: string) {
  return s.trim().toLowerCase().replace(/[’']/g, "'").replace(/[.!?,;:]+$/g, "").replace(/\s+/g, " ");
}

export function isCorrect(q: AssessmentQuestion, a: AnswerValue | undefined): boolean {
  if (a === undefined || a === "") return false;
  if (q.type === "mcq") return a === q.answer;
  return q.accepted.some((acc) => normalise(acc) === normalise(String(a)));
}

export function gradeAssessment(assessment: Assessment, answers: Record<string, AnswerValue>): AssessmentResult {
  const bySkill: AssessmentResult["bySkill"] = {};
  const mistakes: AssessmentResult["mistakes"] = [];
  let score = 0;
  let total = 0;
  for (const section of assessment.sections) {
    const s = (bySkill[section.skill] ??= { score: 0, total: 0 });
    for (const q of section.questions) {
      total++;
      s.total++;
      if (isCorrect(q, answers[q.id])) {
        score++;
        s.score++;
      } else {
        mistakes.push({ questionId: q.id, tag: q.tag, skill: section.skill });
      }
    }
  }
  return {
    id: uid("asm"),
    assessmentId: assessment.id,
    type: assessment.type,
    title: assessment.title,
    completedAt: new Date().toISOString(),
    score,
    total,
    bySkill,
    mistakes,
  };
}
