-- Learners may update their own profile (display name, preferences) but not create or delete profiles:
-- deleting a profile would cascade-delete records outside the audited deletion flow.
-- current_level is not learner-writable (levels come from the diagnostic).
revoke insert, delete on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, teaching_language, interface_language, settings, updated_at) on public.profiles to authenticated;
