-- 1. Ensure user exists
INSERT INTO public.users (id, email, name, password)
VALUES ('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'retrieval_v2@example.com', 'Test User V2', 'hashed_password')
ON CONFLICT (id) DO NOTHING;

-- 2. Create the specific conversation
INSERT INTO public.conversations (id, user_id, title, status)
VALUES ('eb597fd4-45a4-4b4d-b5f0-efd10d346390', '0b2f1be7-fa64-4a19-9736-e049842abfe5', 'Refactored Retrieval Test', 'active')
ON CONFLICT (id) DO NOTHING;

-- 3. Ensure people exist (UPSERT by user_id + name if possible, or just insert)
INSERT INTO public.people (user_id, name, relationship, facts)
VALUES 
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'Alice Johnson', 'coworker', '["Works in finance", "Lives in Berlin"]'),
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'Bob Smith', 'friend', '["Likes hiking", "Has a dog named Max"]')
ON CONFLICT DO NOTHING;

-- 4. Insert 12 conversation messages for fallback testing (>= 10)
INSERT INTO public.conversation_messages (id, conversation_id, user_id, role, content, created_at)
SELECT 
  gen_random_uuid(),
  'eb597fd4-45a4-4b4d-b5f0-efd10d346390', 
  '0b2f1be7-fa64-4a19-9736-e049842abfe5', 
  CASE WHEN (i % 2) = 0 THEN 'assistant' ELSE 'user' END,
  'Contextual fallback history message number ' || i,
  now() - (i || ' minutes')::interval
FROM generate_series(1, 12) s(i);

-- 5. Insert 8 message_embeddings with mixed sources and requested content
-- Using dummy 384d vectors
INSERT INTO public.message_embeddings (user_id, content, source, metadata, embedding)
VALUES 
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'Alice mentioned the Q3 finance report deadline is Friday.', 'message', '{"importance": "high", "type": "deadline", "person": "Alice"}', array_fill(0.11, ARRAY[384])::vector),
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'Bob wants to go hiking next weekend.', 'message', '{"type": "plan", "person": "Bob"}', array_fill(0.22, ARRAY[384])::vector),
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'Project Phoenix launch checklist is stored in Notion.', 'message', '{"project": "Phoenix", "platform": "Notion"}', array_fill(0.33, ARRAY[384])::vector),
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'Alice preferred coffee over tea during the meeting.', 'memory', '{"person": "Alice", "preference": "coffee"}', array_fill(0.44, ARRAY[384])::vector),
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'Bob is training for a marathon in September.', 'memory', '{"person": "Bob", "goal": "marathon"}', array_fill(0.55, ARRAY[384])::vector),
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'The office will be closed for Easter Monday.', 'memory', '{"type": "holiday"}', array_fill(0.66, ARRAY[384])::vector),
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'Remember to check the finance report after Alice reviews it.', 'message', '{"task": "review", "ref": "finance"}', array_fill(0.77, ARRAY[384])::vector),
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'User usually journals at 9 PM.', 'memory', '{"habit": "journaling"}', array_fill(0.88, ARRAY[384])::vector);
