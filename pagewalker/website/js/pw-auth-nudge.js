/**
 * Lightweight auth prompt popover (guest users). Reusable for discover,
 * future review/like actions, etc. Stays on the current page until the user
 * follows Sign in / Sign up.
 */

let popEl = null;
let onDocMousedown = null;
let onEsc = null;
let onScroll = null;
let onResize = null;
let onI18n = null;
let lastAnchor = null;

function t(key, fallback) {
  if (window.pwT) return window.pwT(key);
  return fallback != null ? fallback : key;
}

function bindCleanup() {
  onDocMousedown = (e) => {
    if (popEl && (popEl === e.target || popEl.contains(e.target))) return;
    if (lastAnchor && (lastAnchor === e.target || (lastAnchor instanceof Element && lastAnchor.contains(e.target))))
      return;
    closeAuthNudge();
  };
  onEsc = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeAuthNudge();
    }
  };
  onScroll = () => {
    if (lastAnchor instanceof Element && lastAnchor.isConnected && popEl) {
      positionNear(lastAnchor, popEl);
    }
  };
  onResize = () => {
    if (lastAnchor instanceof Element && lastAnchor.isConnected && popEl) {
      positionNear(lastAnchor, popEl);
    }
  };
  onI18n = () => {
    closeAuthNudge();
  };

  setTimeout(() => {
    document.addEventListener("mousedown", onDocMousedown, true);
  }, 0);
  document.addEventListener("keydown", onEsc, true);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onResize);
  document.addEventListener("pw:i18n-ready", onI18n);
}

function unbindCleanup() {
  if (onDocMousedown) document.removeEventListener("mousedown", onDocMousedown, true);
  if (onEsc) document.removeEventListener("keydown", onEsc, true);
  if (onScroll) window.removeEventListener("scroll", onScroll, true);
  if (onResize) window.removeEventListener("resize", onResize);
  if (onI18n) document.removeEventListener("pw:i18n-ready", onI18n);
  onDocMousedown = onEsc = onScroll = onResize = onI18n = null;
}

function positionNear(anchor, el) {
  if (!(anchor instanceof Element)) return;
  const r = anchor.getBoundingClientRect();
  const w = 288;
  let left = r.left;
  if (left + w > window.innerWidth - 10) left = Math.max(10, window.innerWidth - 10 - w);
  if (left < 10) left = 10;
  const top = r.bottom + 8;
  el.style.cssText = `position:fixed;top:${Math.round(top)}px;left:${Math.round(left)}px;width:${w}px;z-index:150;max-width:min(${w}px, calc(100vw - 1.5rem));`;
}

/**
 * Dismiss the popover and remove global listeners.
 */
export function closeAuthNudge() {
  lastAnchor = null;
  unbindCleanup();
  if (popEl?.parentNode) popEl.remove();
  popEl = null;
}

/**
 * Show a small popover below `anchor` asking the user to sign in.
 *
 * @param {Element} anchor
 * @param {object} [options]
 * @param {string} [options.i18nKey] - key in pw-i18n
 * @param {string} [options.fallback] - default English
 * @param {string} [options.signInHref]
 * @param {string} [options.signUpHref]
 */
export function showAuthNudge(anchor, options = {}) {
  if (!(anchor instanceof Element)) return;
  closeAuthNudge();

  const {
    i18nKey = "authNudge.addToLibrary",
    fallback = "Sign in to add books to your lists",
    signInHref = "/sign-in",
    signUpHref = "/sign-up",
  } = options;
  const message = t(i18nKey, fallback);
  const signIn = t("appShell.signIn", "Sign in");
  const signUp = t("appShell.signUp", "Sign up");
  const titleId = "pw-auth-nudge-title";

  lastAnchor = anchor;
  popEl = document.createElement("div");
  popEl.id = "pw-auth-nudge";
  popEl.className = "pw-auth-nudge";
  popEl.setAttribute("role", "dialog");
  popEl.setAttribute("aria-modal", "false");
  popEl.setAttribute("aria-labelledby", titleId);
  const box = document.createElement("div");
  box.className = "pw-auth-nudge__box";
  const p = document.createElement("p");
  p.className = "pw-auth-nudge__msg";
  p.id = titleId;
  p.textContent = message;
  const row = document.createElement("div");
  row.className = "pw-auth-nudge__actions";
  const a1 = document.createElement("a");
  a1.className = "btn";
  a1.href = signInHref;
  a1.textContent = signIn;
  const a2 = document.createElement("a");
  a2.className = "btn btn-outline";
  a2.href = signUpHref;
  a2.textContent = signUp;
  row.appendChild(a1);
  row.appendChild(a2);
  box.appendChild(p);
  box.appendChild(row);
  popEl.appendChild(box);
  document.body.appendChild(popEl);
  positionNear(anchor, popEl);
  bindCleanup();
  const first = popEl.querySelector("a");
  if (first instanceof HTMLAnchorElement) {
    setTimeout(() => first.focus(), 0);
  }
}

/**
 * @param {Element} anchor
 * @param {object} session
 * @param {object} [nudgeOptions] - passed to showAuthNudge if guest
 * @returns {boolean} true if the user is signed in (proceed with action)
 */
export function guardAuthAction(anchor, session, nudgeOptions) {
  if (session?.user) return true;
  showAuthNudge(anchor, nudgeOptions);
  return false;
}
