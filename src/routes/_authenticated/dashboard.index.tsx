import { createFileRoute, Link } from "@tanstack/react-router";

import { useLeads, useLinks, usePageEvents, usePosts, useProfile } from "@/lib/creator-data";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const { data: profile } = useProfile();
  const { data: links } = useLinks();
  const { data: posts } = usePosts();
  const { data: leads } = useLeads();
  const { data: events } = usePageEvents();

  const visits = events?.filter((e) => e.event_type === "visit").length ?? 0;
  const clicks = events?.filter((e) => e.event_type === "click").length ?? 0;
  const leadCount = leads?.length ?? 0;
  const conversion = visits > 0 ? Math.round((leadCount / visits) * 1000) / 10 : 0;

  const cards = [
    { label: "Visitas", value: visits },
    { label: "Cliques", value: clicks },
    { label: "Leads", value: leadCount },
    { label: "Conversão", value: `${conversion}%` },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">
        Olá{profile?.display_name ? `, ${profile.display_name}` : ""}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {profile ? (
          <>
            Sua página está em{" "}
            <a
              href={`/@${profile.username}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-4"
            >
              /@{profile.username}
            </a>
          </>
        ) : (
          "Carregando sua página..."
        )}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link
          to="/dashboard/page"
          className="rounded-lg border border-border p-5 transition-colors hover:border-primary"
        >
          <h2 className="text-base font-semibold">Minha página</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {links?.length ?? 0} link(s) publicado(s). Ajuste perfil, links e formulário.
          </p>
        </Link>
        <Link
          to="/dashboard/content"
          className="rounded-lg border border-border p-5 transition-colors hover:border-primary"
        >
          <h2 className="text-base font-semibold">Conteúdo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {posts?.filter((p) => p.status === "published").length ?? 0} publicado(s),{" "}
            {posts?.filter((p) => p.status === "draft").length ?? 0} rascunho(s).
          </p>
        </Link>
      </div>
    </div>
  );
}
