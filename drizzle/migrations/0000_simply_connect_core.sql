-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  tagline TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  newsletter_headline TEXT NOT NULL DEFAULT 'Entre na minha lista',
  newsletter_incentive TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX profiles_username_lower_idx ON public.profiles (lower(username));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles are publicly readable" ON public.profiles
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users delete own profile" ON public.profiles
  FOR DELETE TO authenticated USING (auth.uid() = id);

-- Links
CREATE TABLE public.links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX links_user_id_idx ON public.links (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.links TO authenticated;
GRANT SELECT ON public.links TO anon;
GRANT ALL ON public.links TO service_role;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active links are publicly readable" ON public.links
  FOR SELECT TO anon USING (is_active);
CREATE POLICY "users read own links" ON public.links
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_active);
CREATE POLICY "users insert own links" ON public.links
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own links" ON public.links
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own links" ON public.links
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Posts (microblog)
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX posts_user_id_idx ON public.posts (user_id);
CREATE INDEX posts_status_idx ON public.posts (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "published posts are publicly readable" ON public.posts
  FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "users read own posts" ON public.posts
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR status = 'published');
CREATE POLICY "users insert own posts" ON public.posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own posts" ON public.posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own posts" ON public.posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX leads_user_id_idx ON public.leads (user_id);
CREATE UNIQUE INDEX leads_user_email_idx ON public.leads (user_id, lower(email));

GRANT SELECT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creators read own leads" ON public.leads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "creators delete own leads" ON public.leads
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Analytics events
CREATE TABLE public.page_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('visit','click','lead')),
  link_id UUID REFERENCES public.links(id) ON DELETE SET NULL,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX page_events_user_id_idx ON public.page_events (user_id);
CREATE INDEX page_events_created_at_idx ON public.page_events (created_at);

GRANT SELECT ON public.page_events TO authenticated;
GRANT ALL ON public.page_events TO service_role;
ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creators read own events" ON public.page_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER links_set_updated_at BEFORE UPDATE ON public.links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create a profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix INTEGER := 0;
BEGIN
  base_username := regexp_replace(
    lower(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'creator')),
    '[^a-z0-9_]', '', 'g'
  );
  IF base_username = '' THEN
    base_username := 'creator';
  END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    final_username,
    coalesce(NEW.raw_user_meta_data->>'display_name', final_username)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
