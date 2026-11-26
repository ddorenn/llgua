import type { Metadata } from "next";
import { PlacementView } from "./view";

export const metadata: Metadata = { title: "Диагностика" };

export default function PlacementPage() {
  return <PlacementView />;
}
