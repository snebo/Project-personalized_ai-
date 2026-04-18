-- Enable RLS on users table (it was missed in previous migration)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 1. Users Table Policies
CREATE POLICY "Users can view their own profile" ON public.users 
  FOR SELECT USING (id::text = current_setting('app.current_user_id', true) OR id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.users 
  FOR UPDATE USING (id::text = current_setting('app.current_user_id', true) OR id = auth.uid());

-- 2. Conversations Policies (Explicit)
DROP POLICY IF EXISTS "Users can access their own conversations" ON public.conversations;
CREATE POLICY "Users can select their own conversations" ON public.conversations FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true) OR user_id = auth.uid());
CREATE POLICY "Users can insert their own conversations" ON public.conversations FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true) OR user_id = auth.uid());
CREATE POLICY "Users can update their own conversations" ON public.conversations FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true) OR user_id = auth.uid());

-- 3. Messages Policies (Explicit)
DROP POLICY IF EXISTS "Users can access their own messages" ON public.conversation_messages;
CREATE POLICY "Users can select their own messages" ON public.conversation_messages FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true) OR user_id = auth.uid());
CREATE POLICY "Users can insert their own messages" ON public.conversation_messages FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true) OR user_id = auth.uid());

-- 4. Embeddings Policies (Explicit)
DROP POLICY IF EXISTS "Users can access their own embeddings" ON public.message_embeddings;
CREATE POLICY "Users can select their own embeddings" ON public.message_embeddings FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true) OR user_id = auth.uid());
CREATE POLICY "Users can insert their own embeddings" ON public.message_embeddings FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true) OR user_id = auth.uid());

-- 5. People Policies (Explicit)
DROP POLICY IF EXISTS "Users can access their own people" ON public.people;
CREATE POLICY "Users can select their own people" ON public.people FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true) OR user_id = auth.uid());
CREATE POLICY "Users can insert their own people" ON public.people FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true) OR user_id = auth.uid());
CREATE POLICY "Users can update their own people" ON public.people FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true) OR user_id = auth.uid());

-- 6. Memory Entries Policies (Explicit)
DROP POLICY IF EXISTS "Users can access their own memories" ON public.memory_entries;
CREATE POLICY "Users can select their own memories" ON public.memory_entries FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true) OR user_id = auth.uid());
CREATE POLICY "Users can insert their own memories" ON public.memory_entries FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true) OR user_id = auth.uid());
