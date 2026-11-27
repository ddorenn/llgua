-- TRUNCATE ignores row-level security: no API role may hold it (nor TRIGGER / REFERENCES).
-- New tables created by Supabase get these by default, so revoke again and change the defaults.
revoke truncate, trigger, references on all tables in schema public from authenticated, anon;
alter default privileges in schema public revoke truncate, trigger, references on tables from authenticated, anon;
