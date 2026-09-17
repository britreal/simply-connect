import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, ExternalLink, FileText, LayoutGrid, LogOut, Settings, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/creator-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

const NAV = [
  { to: "/dashboard", label: "Visão geral", icon: LayoutGrid, exact: true },
  { to: "/dashboard/page", label: "Minha página", icon: FileText },
  { to: "/dashboard/content", label: "Conteúdo", icon: FileText },
  { to: "/dashboard/leads", label: "Leads", icon: Users },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/settings", label: "Configurações", icon: Settings },
] as const;

function DashboardLayout() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 md:flex-row md:px-6 md:py-10">
        <aside className="md:w-56 md:shrink-0">
          <Link to="/" className="font-display text-base font-semibold tracking-tight">
            Simply Connect
          </Link>

          <nav className="mt-6 flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {NAV.map(({ to, label, icon: Icon, ...rest }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: "exact" in rest ? rest.exact : false }}
                className="shrink-0 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                activeProps={{ className: cn("bg-background text-foreground font-medium") }}
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4" aria-hidden />
                  {label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="mt-8 space-y-2">
            {profile ? (
              <a
                href={`/@${profile.username}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 text-sm text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-4" aria-hidden />@{profile.username}
              </a>
            ) : null}
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start">
              <LogOut className="mr-2 size-4" aria-hidden />
              Sair
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 rounded-xl border border-border bg-background p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
