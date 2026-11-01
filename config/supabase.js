import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hrubrokdmvnpzejqjuqa.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ki003MnbTVLvNppgRrZq1A_IKZJQlc9";

// The app uses its own phone + password accounts (see supabase/app_users.sql),
// not Supabase Auth, so the client doesn't need to persist an auth session.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
