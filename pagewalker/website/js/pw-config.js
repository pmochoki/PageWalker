/**
 * Loads Supabase URL + anon key: prefers Vercel /api/config when env is set,
 * otherwise uses window.PAGEWALKER_PUBLIC_CONFIG (public-config.js).
 */
const CONFIG_FETCH_MS = 10000;

function configFromWindow() {
  const w = window.PAGEWALKER_PUBLIC_CONFIG;
  if (w && w.supabaseUrl && w.supabaseAnonKey) {
    return {
      supabaseUrl: w.supabaseUrl,
      supabaseAnonKey: w.supabaseAnonKey,
    };
  }
  return null;
}

/** Avoid hanging forever on /api/config if the host or edge is slow. */
async function fetchConfigWithTimeout(url) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), CONFIG_FETCH_MS);
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function loadPublicConfig() {
  try {
    const res = await fetchConfigWithTimeout("/api/config");
    if (res.ok) {
      const data = await res.json();
      if (data?.supabaseUrl && data?.supabaseAnonKey) {
        return {
          supabaseUrl: data.supabaseUrl,
          supabaseAnonKey: data.supabaseAnonKey,
        };
      }
    }
  } catch (_) {
    /* offline or no /api on static host */
  }
  const fallback = configFromWindow();
  if (fallback) return fallback;
  throw new Error("config_missing");
}
