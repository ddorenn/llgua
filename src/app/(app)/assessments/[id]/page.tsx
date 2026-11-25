import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assessments, getAssessment } from "@/lib/content";
import { AssessmentRunner } from "./runner";

export function generateStaticParams() {
  return assessments.map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: getAssessment(id)?.title ?? "Assessment" };
}

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getAssessment(id)) notFound();
  return <AssessmentRunner id={id} />;
}
