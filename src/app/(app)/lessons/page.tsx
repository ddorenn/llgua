import { lessonSummaries } from "@/lib/lessons/registry";
import { LessonsList } from "./list";

export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  return <LessonsList lessons={await lessonSummaries()} />;
}
