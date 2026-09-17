import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Link2, Mail, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simply Connect — sua página de criador em um link" },
      {
        name: "description",
        content:
          "Reúna links, microblog e captura de e-mails em uma página só. Veja visitas, cliques e leads em um painel simples.",
      },
      { property: "og:title", content: "Simply Connect — sua página de criador em um link" },
      {
        property: "og:description",
        content:
          "Uma página, todos os seus links, seu microblog e sua lista de e-mails crescendo sozinha.",
      },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  { icon: Link2, title: "Links", text: "Todos os seus destinos em uma lista limpa e ordenável." },
  { icon: PenLine, title: "Microblog", text: "Recados curtos para quem acompanha seu trabalho." },
  { icon: Mail, title: "Lista de e-mails", text: "Capture contatos direto na sua página." },
  { icon: BarChart3, title: "Números", text: "Visitas, cliques, leads e conversão em um lugar." },
] as const;

function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-semibold tracking-tight">Simply Connect</span>
        {loading ? null : user ? (
          <Button asChild size="sm">
            <Link to="/dashboard">Meu painel</Link>
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth" search={{ mode: "signup" }}>
                Criar página
              </Link>
            </Button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="border-b border-border py-20 md:py-28">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Creator pages
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] md:text-6xl">
            Uma página só, com tudo que importa sobre você.
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            Links, microblog e um formulário que transforma quem passa por ali em contato na sua
            lista. Simples de montar, fácil de acompanhar.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Criar minha página
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/@$username" params={{ username: "demo" }}>
                Ver uma página de exemplo
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-8 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon className="size-5 text-primary" aria-hidden />
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="mx-auto max-w-5xl border-t border-border px-6 py-10 text-sm text-muted-foreground">
        Powered by Simply Connect
      </footer>
    </div>
  );
}
