// /src/config/supabase.js
import { createClient } from "@supabase/supabase-js";

// Replace with your Supabase Project API URL and Key
const SUPABASE_URL = "https://fylttgunukwncovjfnxs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5bHR0Z3VudWt3bmNvdmpmbnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0NzI0MTEsImV4cCI6MjA1NjA0ODQxMX0.zoRZXyjanm7GSvueNLv9nOnGyep5QulviXNuS6pSxqw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
