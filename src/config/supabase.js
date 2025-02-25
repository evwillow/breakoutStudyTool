// /src/config/supabase.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// The Supabase client now supports logging rounds, matches, and stats.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
