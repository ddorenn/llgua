import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allLessons, getLesson } from "@/lib/content";
import { LessonPlayer } from "./player";

export function generateStaticParams() {
  return allLessons.map((l) => ({ lessonId: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ lessonId: string }> }): Promise<Metadata> {
  const { lessonId } = await params;
  return { title: getLesson(lessonId)?.title ?? "Урок" };
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  if (!getLesson(lessonId)) notFound();
  return <LessonPlayer lessonId={lessonId} />;
}
