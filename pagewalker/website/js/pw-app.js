import { getSupabase } from "./pw-supabase.js";

function tr(key, fallback) {
  if (window.pwT) return window.pwT(key);
  return fallback || key;
}

function showBanner(el, type, text) {
  if (!el) return;
  el.hidden = false;
  el.className = "pw-banner pw-banner--" + type;
  el.textContent = text;
}

function hideBanner(el) {
  if (el) el.hidden = true;
}

async function initSignIn() {
  const form = document.getElementById("pw-form-signin");
  const err = document.getElementById("pw-err");
  const ok = document.getElementById("pw-ok");
  const supabase = await getSupabase();
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideBanner(err);
    hideBanner(ok);
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showBanner(err, "error", error.message);
      return;
    }
    showBanner(ok, "success", tr("app.signedIn"));
  });
}

async function initSignUp() {
  const form = document.getElementById("pw-form-signup");
  const err = document.getElementById("pw-err");
  const ok = document.getElementById("pw-ok");
  const supabase = await getSupabase();
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideBanner(err);
    hideBanner(ok);
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const password2 = String(fd.get("password2") || "");
    const displayName = String(fd.get("display_name") || "").trim();
    if (password.length < 6) {
      showBanner(err, "error", tr("app.passwordShort"));
      return;
    }
    if (password !== password2) {
      showBanner(err, "error", tr("app.passwordMismatch"));
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: displayName ? { full_name: displayName } : undefined,
      },
    });
    if (error) {
      showBanner(err, "error", error.message);
      return;
    }
    if (data.user && !data.session) {
      showBanner(ok, "success", tr("app.signupCheckEmail"));
      return;
    }
    showBanner(ok, "success", tr("app.signupReady"));
  });
}

async function initForgot() {
  const form = document.getElementById("pw-form-forgot");
  const err = document.getElementById("pw-err");
  const ok = document.getElementById("pw-ok");
  const supabase = await getSupabase();
  const redirectTo = new URL("/auth/update-password", window.location.origin).href;
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideBanner(err);
    hideBanner(ok);
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      showBanner(err, "error", error.message);
      return;
    }
    showBanner(ok, "success", tr("app.resetSent"));
  });
}

async function waitForSession(supabase, maxMs) {
  const step = 250;
  for (let t = 0; t < maxMs; t += step) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session;
    await new Promise((r) => setTimeout(r, step));
  }
  return null;
}

async function initUpdatePassword() {
  const form = document.getElementById("pw-form-update-password");
  const err = document.getElementById("pw-err");
  const ok = document.getElementById("pw-ok");
  const pending = document.getElementById("pw-pending-session");
  const supabase = await getSupabase();

  if (pending) pending.hidden = false;
  const session = await waitForSession(supabase, 6000);
  if (pending) pending.hidden = true;

  if (!session) {
    showBanner(err, "error", tr("app.resetInvalid"));
    if (form) form.style.display = "none";
    return;
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideBanner(err);
    hideBanner(ok);
    const fd = new FormData(form);
    const password = String(fd.get("password") || "");
    const password2 = String(fd.get("password2") || "");
    if (password.length < 6) {
      showBanner(err, "error", tr("app.passwordShort"));
      return;
    }
    if (password !== password2) {
      showBanner(err, "error", tr("app.passwordMismatch"));
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      showBanner(err, "error", error.message);
      return;
    }
    showBanner(ok, "success", tr("app.passwordUpdated"));
    if (form) form.style.display = "none";
  });
}

const page = document.documentElement.dataset.pwPage;

async function boot() {
  const err = document.getElementById("pw-err");
  try {
    await getSupabase();
  } catch (e) {
    showBanner(err, "error", tr("app.configError"));
    return;
  }
  switch (page) {
    case "sign-in":
      await initSignIn();
      break;
    case "sign-up":
      await initSignUp();
      break;
    case "forgot-password":
      await initForgot();
      break;
    case "update-password":
      await initUpdatePassword();
      break;
    default:
      break;
  }
}

boot();
