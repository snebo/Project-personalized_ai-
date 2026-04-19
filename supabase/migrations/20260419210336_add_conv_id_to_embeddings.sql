-- Add conversation_id to message_embeddings
ALTER TABLE public.message_embeddings 
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;
