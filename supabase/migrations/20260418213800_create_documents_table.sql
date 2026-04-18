-- 1. documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_type TEXT,
  file_size INT,
  storage_path TEXT, -- path in supabase storage
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add document_id to message_embeddings
ALTER TABLE public.message_embeddings 
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE;

-- 3. RLS for documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own documents" ON public.documents 
  FOR ALL USING (user_id::text = current_setting('app.current_user_id', true) OR user_id = auth.uid());

