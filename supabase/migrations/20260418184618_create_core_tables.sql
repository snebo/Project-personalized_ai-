-- Enable the "vector" extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. message_embeddings (Shared table for all vector data)
CREATE TABLE IF NOT EXISTS public.message_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID, -- FK, added after table creation
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(384), -- Dimension for Supabase/gte-small
  source TEXT NOT NULL, -- message/document/memory
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. conversation_messages
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user/assistant
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add message_id FK to message_embeddings
ALTER TABLE public.message_embeddings 
  ADD CONSTRAINT fk_message_embeddings_message_id 
  FOREIGN KEY (message_id) REFERENCES public.conversation_messages(id) ON DELETE SET NULL;

-- 4. people
CREATE TABLE IF NOT EXISTS public.people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  facts JSONB DEFAULT '[]',
  first_mentioned_at TIMESTAMPTZ DEFAULT now(),
  last_mentioned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. memory_entries
CREATE TABLE IF NOT EXISTS public.memory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT NOT NULL, -- fact/preference/relationship/emotion
  entity_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  embedding_id UUID REFERENCES public.message_embeddings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
-- Note: These policies assume standard Supabase auth. For custom JWTs, you might need to adjust them.
ALTER TABLE public.message_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- message_embeddings policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can access their own embeddings') THEN
    CREATE POLICY "Users can access their own embeddings" ON public.message_embeddings FOR ALL USING (user_id = auth.uid());
  END IF;

  -- conversations policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can access their own conversations') THEN
    CREATE POLICY "Users can access their own conversations" ON public.conversations FOR ALL USING (user_id = auth.uid());
  END IF;

  -- conversation_messages policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can access their own messages') THEN
    CREATE POLICY "Users can access their own messages" ON public.conversation_messages FOR ALL USING (user_id = auth.uid());
  END IF;

  -- people policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can access their own people') THEN
    CREATE POLICY "Users can access their own people" ON public.people FOR ALL USING (user_id = auth.uid());
  END IF;

  -- memory_entries policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can access their own memories') THEN
    CREATE POLICY "Users can access their own memories" ON public.memory_entries FOR ALL USING (user_id = auth.uid());
  END IF;
END
$$;

-- HNSW Index on embeddings
CREATE INDEX IF NOT EXISTS message_embeddings_hnsw_idx 
  ON public.message_embeddings USING hnsw (embedding vector_cosine_ops) 
  WITH (m = 16, ef_construction = 64);
