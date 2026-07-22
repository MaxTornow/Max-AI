-- ============================================================================
-- 011_expand_conversation_agent_types.sql
-- Widens conversations.agent_type to also allow 'sage' and 'aimax', so those
-- chats can save/load conversation history the same way ava/franck/lacy do.
-- ============================================================================

ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_agent_type_check;

ALTER TABLE public.conversations ADD CONSTRAINT conversations_agent_type_check
  CHECK (agent_type IN ('ava', 'vera', 'lara', 'lacy', 'franck', 'faris', 'sage', 'aimax'));
