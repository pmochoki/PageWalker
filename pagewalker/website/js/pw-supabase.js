import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { loadPublicConfig } from "./pw-config.js";

let client;

export async function getSupabase() {
  if (client) return client;
  const cfg = await loadPublicConfig();
  client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  });
  return client;
}
