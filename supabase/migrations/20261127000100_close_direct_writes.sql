-- LINGUA — close direct writes (apply only after LINGUA_SIGNING_SECRET is set on the server and
-- the same value is stored in private.app_secrets as 'write_signing').
-- After this, learners can only read placement data; every write must be signed by the server.

revoke insert, update, delete on public.placements, public.placement_responses, public.learner_consents from authenticated;
revoke insert, update, delete on public.placement_feedback, public.ai_usage from authenticated;
drop policy if exists "own feedback: add" on public.placement_feedback;
drop policy if exists "own usage: add" on public.ai_usage;
grant select on public.placements, public.placement_responses, public.learner_consents, public.placement_feedback, public.ai_usage to authenticated;
