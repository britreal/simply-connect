import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Entrar — Simply Connect" },
      { name: "description", content: "Acesse seu painel do Simply Connect ou crie sua página." },
      { property: "og:title", content: "Entrar — Simply Connect" },
      { property: "og:description", content: "Acesse seu painel ou crie sua página de criador." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const credentialsSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido").max(255),
  password: z.string().min(8, "A senha precisa de ao menos 8 caracteres").max(72),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setAwaitingConfirmation(true);
          return;
        }
        await navigate({ to: "/dashboard", replace: true });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) throw error;
      await navigate({ to: "/dashboard", replace: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Não foi possível continuar";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (awaitingConfirmation) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold">Confirme seu e-mail</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Enviamos um link para <span className="text-foreground">{email}</span>. Clique nele para
          ativar sua conta e voltar aqui.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl font-semibold">
        {isSignUp ? "Criar sua página" : "Entrar na sua conta"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {isSignUp ? "Leva menos de um minuto." : "Bem-vindo de volta."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setIsSignUp((value) => !value)}
        className="mt-6 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {isSignUp ? "Já tenho conta, quero entrar" : "Não tenho conta, quero criar"}
      </button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-md px-6 py-10">
        <Link to="/" className="font-display text-lg font-semibold tracking-tight">
          Simply Connect
        </Link>
      </div>
      <div className="mx-auto w-full max-w-md px-6 pb-20">{children}</div>
    </div>
  );
}
