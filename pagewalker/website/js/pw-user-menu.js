/**
 * Top-right account avatar + dropdown (pagewalker.org web app shell only).
 * Depends: #pw-user-menu, getSupabase client, window.pwT, window.pwSyncNav (set by pw-webapp).
 */

const PROFILE_Q_TIMEOUT_MS = 10000;

function t(key, fallback) {
  if (window.pwT) return window.pwT(key);
  return fallback != null ? fallback : key;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]);
}

function showSignedOutBanner() {
  const err = document.getElementById("pw-err");
  const ok = document.getElementById("pw-ok");
  if (err) err.hidden = true;
  if (ok) {
    ok.hidden = false;
    ok.className = "pw-banner pw-banner--success";
    ok.textContent = t("appShell.signedOut", "You are signed out.");
  }
}

function showErrorBanner(msg) {
  const err = document.getElementById("pw-err");
  const ok = document.getElementById("pw-ok");
  if (ok) ok.hidden = true;
  if (err) {
    err.hidden = false;
    err.className = "pw-banner pw-banner--error";
    err.textContent = msg;
  }
}

function escapeHtml(v) {
  return String(v || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getInitialForName(name, email) {
  const s = String(name || "").trim();
  if (s) {
    const first = [...s][0] || s.charAt(0);
    return first.toLocaleUpperCase();
  }
  const e = String(email || "").trim();
  if (e) return (e[0] || "?").toLocaleUpperCase();
  return "";
}

function displayNameFromParts(profile, email) {
  if (profile?.full_name) return String(profile.full_name).trim();
  if (profile?.display_name) return String(profile.display_name).trim();
  if (profile?.username) return String(profile.username).trim();
  if (email) return String(email).split("@")[0] || email;
  return t("appShell.authGuest", "Guest mode");
}

async function loadProfile(supabase, userId) {
  try {
    const { data, error } = await withTimeout(
      supabase.from("profiles").select("username, full_name, display_name").eq("id", userId).maybeSingle(),
      PROFILE_Q_TIMEOUT_MS,
    );
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export function initUserMenu(supabase) {
  const root = document.getElementById("pw-user-menu");
  const btn = document.getElementById("pw-user-avatar");
  const initialEl = document.getElementById("pw-user-initial");
  const iconWrap = document.getElementById("pw-user-icon");
  const panel = document.getElementById("pw-user-dropdown");
  const body = document.getElementById("pw-user-menu-body");
  if (!root || !btn || !panel || !body) {
    return { refresh: async () => {}, close: () => {} };
  }

  let open = false;
  let lastSession = null;

  function setOpen(v) {
    open = v;
    btn.setAttribute("aria-expanded", v ? "true" : "false");
    if (v) {
      panel.hidden = false;
    } else {
      panel.hidden = true;
    }
  }

  function close() {
    if (open) setOpen(false);
  }

  function renderGuest() {
    if (initialEl) {
      initialEl.textContent = "";
      initialEl.hidden = true;
    }
    if (iconWrap) iconWrap.hidden = false;
    body.innerHTML = `
      <div class="pw-user-menu__actions pw-user-menu__actions--guest">
        <a class="btn" href="/sign-in">${escapeHtml(t("appShell.signIn", "Sign in"))}</a>
        <a class="btn btn-outline" href="/sign-up">${escapeHtml(t("appShell.signUp", "Sign up"))}</a>
      </div>
    `;
  }

  function renderSignedIn(name, email) {
    const n = name || t("appShell.authGuest", "Reader");
    const e = email || "—";
    body.innerHTML = `
      <div class="pw-user-menu__head">
        <p class="pw-user-menu__name">${escapeHtml(n)}</p>
        <p class="pw-user-menu__email">${escapeHtml(e)}</p>
      </div>
      <div class="pw-user-menu__hr" role="separator"></div>
      <nav class="pw-user-menu__nav" aria-label="${escapeHtml(t("userMenu.ariaNav", "Account"))}">
        <a class="pw-user-menu__link" href="/profile" data-link-route="/profile">${escapeHtml(t("userMenu.profileSettings", "Profile settings"))}</a>
        <a class="pw-user-menu__link" href="/library" data-link-route="/library">${escapeHtml(t("appNav.library", "Library"))}</a>
      </nav>
      <div class="pw-user-menu__hr" role="separator"></div>
      <button type="button" class="pw-user-menu__signout" id="pw-user-menu-signout">${escapeHtml(t("appShell.signOut", "Sign out"))}</button>
    `;
    const out = document.getElementById("pw-user-menu-signout");
    out?.addEventListener("click", async () => {
      close();
      const { error } = await supabase.auth.signOut();
      if (error) {
        showErrorBanner(error.message);
        return;
      }
      showSignedOutBanner();
    });
  }

  async function refresh(session) {
    lastSession = session;
    if (!session?.user) {
      if (initialEl) {
        initialEl.textContent = "";
        initialEl.hidden = true;
      }
      if (iconWrap) iconWrap.hidden = false;
      renderGuest();
    } else {
      const email = session.user.email || "";
      const profile = await loadProfile(supabase, session.user.id);
      const dname = displayNameFromParts(profile, email);
      const initial = getInitialForName(
        profile?.display_name || profile?.full_name || profile?.username,
        email,
      );
      const showLetter = Boolean(initial);
      if (iconWrap) iconWrap.hidden = showLetter;
      if (initialEl) {
        initialEl.textContent = initial || "?";
        initialEl.hidden = !showLetter;
      }
      renderSignedIn(dname, email);
    }
    if (window.pwSyncNav) window.pwSyncNav();
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(!open);
  });

  body.addEventListener("click", (e) => {
    const t = e.target;
    if (t instanceof HTMLAnchorElement && t.getAttribute("data-link-route")) {
      close();
    }
  });

  document.addEventListener(
    "mousedown",
    (e) => {
      if (!open) return;
      if (root.contains(e.target)) return;
      close();
    },
    true,
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      close();
      btn.focus();
    }
  });

  document.addEventListener("pw:i18n-ready", () => {
    void refresh(lastSession);
  });

  return { refresh, close };
}
