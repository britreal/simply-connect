import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type CreatorLink = Database["public"]["Tables"]["links"]["Row"];
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type PageEvent = Database["public"]["Tables"]["page_events"]["Row"];

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("Nenhum dado retornado");
  return result.data;
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      return unwrap(
        await supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
      );
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Profile>) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const { error } = await supabase.from("profiles").update(values).eq("id", auth.user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useLinks() {
  return useQuery({
    queryKey: ["links"],
    queryFn: async (): Promise<CreatorLink[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const { data, error } = await supabase
        .from("links")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("position", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function usePosts() {
  return useQuery({
    queryKey: ["posts"],
    queryFn: async (): Promise<Post[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async (): Promise<Lead[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function usePageEvents() {
  return useQuery({
    queryKey: ["page-events"],
    queryFn: async (): Promise<PageEvent[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const { data, error } = await supabase
        .from("page_events")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export async function signOutAndRedirect(clearCache: () => Promise<void> | void) {
  await clearCache();
  await supabase.auth.signOut();
}
