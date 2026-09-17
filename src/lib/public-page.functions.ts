import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

export interface PublicLink {
  id: string;
  label: string;
  url: string;
}

export interface PublicPost {
  id: string;
  content: string;
  published_at: string | null;
  created_at: string;
}

export interface PublicPage {
  userId: string;
  username: string;
  displayName: string;
  tagline: string;
  bio: string;
  avatarUrl: string | null;
  newsletterHeadline: string;
  newsletterIncentive: string;
  links: PublicLink[];
  posts: PublicPost[];
}

const usernameSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .transform((value) => value.replace(/^@/, "").toLowerCase());

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Backend configuration is missing");

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const getPublicPage = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ username: usernameSchema }).parse(data))
  .handler(async ({ data }): Promise<PublicPage | null> => {
    const supabase = await publicClient();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, tagline, bio, avatar_url, newsletter_headline, newsletter_incentive",
      )
      .ilike("username", data.username)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!profile) return null;

    const [{ data: links }, { data: posts }] = await Promise.all([
      supabase
        .from("links")
        .select("id, label, url")
        .eq("user_id", profile.id)
        .eq("is_active", true)
        .order("position", { ascending: true }),
      supabase
        .from("posts")
        .select("id, content, published_at, created_at")
        .eq("user_id", profile.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(10),
    ]);

    return {
      userId: profile.id,
      username: profile.username,
      displayName: profile.display_name || profile.username,
      tagline: profile.tagline,
      bio: profile.bio,
      avatarUrl: profile.avatar_url,
      newsletterHeadline: profile.newsletter_headline,
      newsletterIncentive: profile.newsletter_incentive,
      links: links ?? [],
      posts: posts ?? [],
    };
  });

const leadSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().trim().min(1, "Informe seu nome").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  source: z.string().trim().max(60).optional(),
});

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => leadSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("leads").upsert(
      {
        user_id: data.userId,
        name: data.name,
        email: data.email.toLowerCase(),
        source: data.source ?? "page",
      },
      { onConflict: "user_id,email", ignoreDuplicates: true },
    );

    // Duplicate signups should look successful to the visitor.
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      console.error("Lead insert failed", error);
      throw new Error("Não foi possível salvar seu contato agora.");
    }

    await supabaseAdmin
      .from("page_events")
      .insert({ user_id: data.userId, event_type: "lead" });

    return { ok: true as const };
  });

const eventSchema = z.object({
  userId: z.string().uuid(),
  eventType: z.enum(["visit", "click"]),
  linkId: z.string().uuid().nullish(),
  referrer: z.string().trim().max(500).nullish(),
});

export const trackPageEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => eventSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("page_events").insert({
        user_id: data.userId,
        event_type: data.eventType,
        link_id: data.linkId ?? null,
        referrer: data.referrer ?? null,
      });
    } catch (error) {
      // Analytics must never break the public page.
      console.error("Failed to record page event", error);
    }
    return { ok: true as const };
  });
