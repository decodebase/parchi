import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DesktopLayout } from "@/components/layout/DesktopLayout";

export const runtime = 'edge';

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/dashboard");

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("role, display_name, avatar_url")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { role: string; display_name: string | null; avatar_url: string | null } | null;

  const role = profile?.role;

  // Only organisers and admins can access the dashboard
  if (!role || !["organiser", "admin"].includes(role)) {
    redirect("/?error=unauthorized");
  }

  return <DesktopLayout>{children}</DesktopLayout>;
}
