-- Seed deterministic data for Retrieval testing
-- User and Conversation
INSERT INTO public.users (id, email, name, password)
VALUES ('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'retrieval_test@example.com', 'Test User', 'hashed_password')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.conversations (id, user_id, title)
VALUES ('0b2f1be7-fa64-4a19-9736-e049842abfe5', '0b2f1be7-fa64-4a19-9736-e049842abfe5', 'Retrieval Test Conversation')
ON CONFLICT (id) DO NOTHING;

-- People and Facts
INSERT INTO public.people (user_id, name, relationship, facts)
VALUES 
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'Alice Johnson', 'coworker', '["Works in finance", "Lives in Berlin"]'),
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'Bob Smith', 'friend', '["Likes hiking", "Has a dog named Max"]');

-- 10 messages for fallback testing
INSERT INTO public.conversation_messages (id, conversation_id, user_id, role, content)
SELECT 
  gen_random_uuid(),
  '0b2f1be7-fa64-4a19-9736-e049842abfe5', 
  '0b2f1be7-fa64-4a19-9736-e049842abfe5', 
  CASE WHEN (i % 2) = 0 THEN 'assistant' ELSE 'user' END,
  'Fallback conversation message ' || i
FROM generate_series(1, 10) s(i);

-- 6 message_embeddings with mixed sources
-- Note: Using dummy vectors [0.1, 0.2, ...] (384 dimensions truncated here for brevity)
INSERT INTO public.message_embeddings (user_id, content, source, metadata, embedding)
VALUES 
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'Alice mentioned the Q3 finance report deadline is Friday.', 'message', '{"category": "finance", "person": "Alice"}', array_fill(0.1, ARRAY[384])::vector),
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'Bob wants to go hiking next weekend.', 'message', '{"category": "social", "person": "Bob"}', array_fill(0.2, ARRAY[384])::vector),
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'Project Phoenix launch checklist is stored in Notion.', 'document', '{"doc_id": "phoenix-123", "platform": "notion"}', array_fill(0.3, ARRAY[384])::vector),
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'User prefers dark mode and silent notifications.', 'memory', '{"type": "preference"}', array_fill(0.4, ARRAY[384])::vector),
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'The company retreat is scheduled for July in the Alps.', 'document', '{"type": "announcement"}', array_fill(0.5, ARRAY[384])::vector),
('0b2f1be7-fa64-4a19-9736-e049842abfe5', 'Bob has a dog named Max.', 'memory', '{"person": "Bob", "pet": "dog"}', array_fill(0.6, ARRAY[384])::vector);
