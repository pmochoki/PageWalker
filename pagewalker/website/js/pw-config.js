/**
 * Loads public Supabase config from Vercel /api/config, or window.PAGEWALKER_PUBLIC_CONFIG.
 */
export async function loadPublicConfig() {
  if (typeof window.PAGEWALKER_PUBLIC_CONFIG === "object" && window.PAGEWALKER_PUBLIC_CONFIG?.supabaseUrl) {
    return window.PAGEWALKER_PUBLIC_CONFIG;
  }
  const res = await fetch("/api/config", { cache: "no-store" });
  if (!res.ok) throw new Error("config_http_" + res.status);
  const data = await res.json();
  if (!data?.supabaseUrl || !data?.supabaseAnonKey) {
    throw new Error("config_missing_env");
  }
  return {
    supabaseUrl: data.supabaseUrl,
    supabaseAnonKey: data.supabaseAnonKey,
  };
}
