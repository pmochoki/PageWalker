import { getSupabase } from "./pw-supabase.js";

function showBanner(el, type, text) {
  if (!el) return;
  el.hidden = false;
  el.className = "pw-banner pw-banner--" + type;
  el.textContent = text;
}

function hideBanner(el) {
  if (el) el.hidden = true;
}

function configHelpHtml() {
  return "We couldn’t load account settings. Refresh the page, or try again in a moment.";
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
    showBanner(
      ok,
      "success",
      "You’re signed in on the web. Open the Pagewalker app and sign in with the same email and password to use your account on your phone."
    );
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
      showBanner(err, "error", "Password must be at least 6 characters.");
      return;
    }
    if (password !== password2) {
      showBanner(err, "error", "Passwords do not match.");
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
      showBanner(
        ok,
        "success",
        "Check your email to confirm your account, then sign in here or in the Pagewalker app."
      );
      return;
    }
    showBanner(
      ok,
      "success",
      "Account ready. You can open the Pagewalker app and sign in with the same email and password."
    );
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
    showBanner(
      ok,
      "success",
      "If an account exists for that email, we sent a reset link. Check your inbox and spam folder."
    );
  });
}

async function waitForSession(supabase, maxMs) {
  const step = 250;
  for (let t = 0; t < maxMs; t += step) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
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
    showBanner(
      err,
      "error",
      "This reset link is invalid or expired. Request a new link from Forgot password."
    );
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
      showBanner(err, "error", "Password must be at least 6 characters.");
      return;
    }
    if (password !== password2) {
      showBanner(err, "error", "Passwords do not match.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      showBanner(err, "error", error.message);
      return;
    }
    showBanner(
      ok,
      "success",
      "Password updated. Sign in on the Pagewalker app with your new password."
    );
    if (form) form.style.display = "none";
  });
}

const page = document.documentElement.dataset.pwPage;

async function boot() {
  const err = document.getElementById("pw-err");
  try {
    await getSupabase();
  } catch (e) {
    showBanner(err, "error", configHelpHtml());
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
