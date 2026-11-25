import type { Metadata } from "next";
import { DashboardView } from "./view";

export const metadata: Metadata = { title: "Главная" };

export default function DashboardPage() {
  return <DashboardView />;
}
