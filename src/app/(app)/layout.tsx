import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { StoreProvider } from "@/lib/store/store";
import { AppShell } from "@/components/layout/app-shell";
import { ReadyGate } from "@/components/layout/ready-gate";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Middleware already guards routes; this is a second, server-side check.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <StoreProvider>
      <AppShell user={{ name: user.name, mode: user.mode }}>
        <ReadyGate>{children}</ReadyGate>
      </AppShell>
    </StoreProvider>
  );
}
