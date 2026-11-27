import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { adminData, isAdmin } from "@/lib/admin";
import { AdminView } from "./view";

export const metadata: Metadata = { title: "Администрирование" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !(await isAdmin(user))) notFound();
  const data = await adminData(user);
  return <AdminView data={JSON.parse(JSON.stringify(data))} canReview={user.mode === "supabase"} />;
}
