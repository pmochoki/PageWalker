/**
 * Public Supabase client settings (same project as the Pagewalker app).
 * Anon key is safe in the browser; RLS applies on the server.
 * Vercel SUPABASE_* env vars override this when set (see pw-config.js).
 */
window.PAGEWALKER_PUBLIC_CONFIG = {
  supabaseUrl: "https://dwbhapuozjfaxsexydux.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3YmhhcHVvempmYXhzZXh5ZHV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODg2NTIsImV4cCI6MjA4OTc2NDY1Mn0.3KhyRHFqxz0K_FF7C9J2Sl5MYx3yl1ZeeIHITWxcXZo",
};
