/**
 * Public Supabase settings for the marketing site (anon key is safe for browsers).
 * Set in Vercel: Project → Settings → Environment Variables:
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY=eyJ...
 * Supabase Dashboard → Authentication → URL Configuration:
 *   Add your production URL and redirect:
 *   https://<your-domain>/auth/update-password
 */

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json");
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  res.status(200).json({ supabaseUrl, supabaseAnonKey });
};
