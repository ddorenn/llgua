import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLesson } from "@/lib/lessons/registry";
import { LessonPlayer } from "@/components/lesson/player";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const lesson = await getLesson((await params).id);
  return { title: lesson ? lesson.title : "Занятие" };
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const lesson = await getLesson((await params).id);
  if (!lesson) notFound();
  return <LessonPlayer lesson={lesson} />;
}
