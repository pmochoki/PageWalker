import { getSupabase } from "./pw-supabase.js";
import { initUserMenu } from "./pw-user-menu.js";
import { closeAuthNudge, guardAuthAction } from "./pw-auth-nudge.js";
import { initAppDrawer } from "./pw-drawer.js";

const APP_ROUTES = new Set([
  "/",
  "/book",
  "/discover",
  "/library",
  "/social",
  "/clubs",
  "/club",
  "/reader",
  "/profile",
]);
/* /discover is public so guests can browse; library actions use auth nudge. */
const PROTECTED_ROUTES = new Set([
  "/library",
  "/social",
  "/clubs",
  "/club",
  "/reader",
  "/profile",
]);
const LIBRARY_STATUSES = ["tbr", "reading", "read", "dnf"];
const DISCOVER_PAGE_SIZE = 12;
const LIBRARY_PAGE_SIZE = 24;
const STATUS_LABELS = {
  tbr: "TBR",
  reading: "Reading",
  read: "Read",
  dnf: "DNF",
};
let discoverQuery = "";
let discoverGenre = "romance";
let discoverMood = "";
const DISCOVER_MOOD_PRESETS = ["Make me cry", "Dark & twisted", "Cozy", "Slow burn", "Magic", "Mystery"];
let libraryFilter = "all";
let discoverPaging = {
  trendingPage: 1,
  genrePage: 1,
  searchPage: 1,
  classicsPage: 1,
};
let libraryPage = 1;
let socialDraft = { title: "", body: "", rating: "5" };
let socialComposerExpanded = false;
let clubsDraft = { name: "", description: "", inviteCode: "", emoji: "📚", maxMembers: "20" };
let readerTimer = {
  running: false,
  startedAtMs: null,
  elapsedSeconds: 0,
};
let readerTicker = null;

function t(key, fallback) {
  if (window.pwT) return window.pwT(key);
  return fallback || key;
}

function showBanner(type, text) {
  const err = document.getElementById("pw-err");
  const ok = document.getElementById("pw-ok");
  if (type === "error") {
    if (ok) ok.hidden = true;
    if (err) {
      err.hidden = false;
      err.className = "pw-banner pw-banner--error";
      err.textContent = text;
    }
    return;
  }
  if (err) err.hidden = true;
  if (ok) {
    ok.hidden = false;
    ok.className = "pw-banner pw-banner--success";
    ok.textContent = text;
  }
}

function hideBanners() {
  const err = document.getElementById("pw-err");
  const ok = document.getElementById("pw-ok");
  if (err) err.hidden = true;
  if (ok) ok.hidden = true;
}

function ensureAppPath() {
  const current = window.location.pathname;
  if (APP_ROUTES.has(current)) return;
  window.history.replaceState({}, "", "/");
}

function setActiveRoute(route) {
  const links = document.querySelectorAll("[data-link-route]");
  for (let i = 0; i < links.length; i += 1) {
    const href = links[i].getAttribute("data-link-route");
    links[i].toggleAttribute("data-active", href === route);
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const MAX_PROFILE_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_STORAGE_KEY = (userId) => `avatar_${userId}.jpg`;

async function imageFileToJpegBlobIfNeeded(file) {
  if (file.type === "image/jpeg") return file;
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image_decode"));
      img.src = objectUrl;
    });
    const maxEdge = 512;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w < 1 || h < 1) throw new Error("image_decode");
    if (w > maxEdge || h > maxEdge) {
      const r = Math.min(maxEdge / w, maxEdge / h);
      w = Math.round(w * r);
      h = Math.round(h * r);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob"))),
        "image/jpeg",
        0.85,
      );
    });
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function setProfilePhotoStatus(text, isError) {
  const el = document.getElementById("pw-profile-photo-status");
  if (!el) return;
  el.textContent = text || "";
  el.hidden = !text;
  if (isError) el.setAttribute("data-state", "error");
  else el.removeAttribute("data-state");
}

function bindProfilePhotoActions(supabase, onAfterChange) {
  const fileInput = document.getElementById("pw-profile-photo-file");
  const pickBtn = document.getElementById("pw-profile-photo-pick");
  const removeBtn = document.getElementById("pw-profile-photo-remove");
  if (!fileInput || !pickBtn) return;

  pickBtn.addEventListener("click", () => {
    setProfilePhotoStatus("", false);
    fileInput.click();
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.type)) {
      setProfilePhotoStatus(
        t("route.profile.photoTypeError", "Please choose a JPG, PNG, or WebP image."),
        true,
      );
      return;
    }
    if (file.size > MAX_PROFILE_AVATAR_BYTES) {
      setProfilePhotoStatus(t("route.profile.photoSizeError", "Image must be 2 MB or smaller."), true);
      return;
    }
    const { data: sessData, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) {
      setProfilePhotoStatus(sessErr.message, true);
      return;
    }
    const user = sessData?.session?.user;
    if (!user) {
      setProfilePhotoStatus(t("route.authRequired", "Please sign in to view this section."), true);
      return;
    }
    pickBtn.disabled = true;
    if (removeBtn) removeBtn.disabled = true;
    setProfilePhotoStatus(t("route.profile.photoUploading", "Uploading…"), false);
    try {
      const blob = await imageFileToJpegBlobIfNeeded(file);
      if (blob.size > MAX_PROFILE_AVATAR_BYTES) {
        setProfilePhotoStatus(t("route.profile.photoSizeError", "Image must be 2 MB or smaller."), true);
        return;
      }
      const fileName = AVATAR_STORAGE_KEY(user.id);
      const { error: upErr } = await supabase.storage.from("avatars").upload(fileName, blob, {
        upsert: true,
        contentType: "image/jpeg",
        cacheControl: "3600",
      });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("no_public_url");
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (dbErr) throw dbErr;
      setProfilePhotoStatus(t("route.profile.photoSuccess", "Profile photo updated."), false);
      await onAfterChange?.();
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : t("route.profile.photoError", "Could not update photo. Try again.");
      setProfilePhotoStatus(msg, true);
    } finally {
      pickBtn.disabled = false;
      if (removeBtn) removeBtn.disabled = false;
    }
  });

  removeBtn?.addEventListener("click", async () => {
    const { data: sessData, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) {
      setProfilePhotoStatus(sessErr.message, true);
      return;
    }
    const user = sessData?.session?.user;
    if (!user) return;
    const fileName = AVATAR_STORAGE_KEY(user.id);
    pickBtn.disabled = true;
    removeBtn.disabled = true;
    setProfilePhotoStatus(t("route.profile.photoRemoving", "Removing…"), false);
    try {
      await supabase.storage.from("avatars").remove([fileName]);
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);
      if (dbErr) throw dbErr;
      setProfilePhotoStatus(t("route.profile.photoRemoved", "Profile photo removed."), false);
      await onAfterChange?.();
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : t("route.profile.photoError", "Could not update photo. Try again.");
      setProfilePhotoStatus(msg, true);
    } finally {
      pickBtn.disabled = false;
      removeBtn.disabled = false;
    }
  });
}

function listToHtml(items) {
  if (!items?.length) {
    return `<p class="muted">${t("appShell.empty", "No items yet.")}</p>`;
  }
  return `<ul class="app-list">${items
    .map((it) => `<li>${it}</li>`)
    .join("")}</ul>`;
}

const DEFAULT_QUERY_TIMEOUT_MS = 20000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("query_timeout")), ms);
    }),
  ]);
}

/** Supabase/PostgREST can hang without rejecting; this caps wait time. */
async function runSafeQuery(work, emptyText, timeoutMs = DEFAULT_QUERY_TIMEOUT_MS) {
  try {
    const rows = await withTimeout(work(), timeoutMs);
    return rows;
  } catch (_) {
    return [{ __error: true, text: emptyText || t("appShell.missingData") }];
  }
}

function normalizeAuthors(authors) {
  if (Array.isArray(authors)) return authors.join(", ");
  return String(authors || "");
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`request_failed_${response.status}`);
  return response.json();
}

function parseGoogleBook(item) {
  const info = item?.volumeInfo || {};
  const images = info?.imageLinks || {};
  let cover = images?.thumbnail || images?.smallThumbnail || null;
  if (cover) {
    cover = String(cover).replace("http://", "https://").replace("zoom=1", "zoom=3");
  }
  const pubDate = String(info?.publishedDate || "");
  return {
    id: `google_${item?.id || Math.random().toString(36).slice(2)}`,
    title: String(info?.title || "Unknown Title"),
    author: normalizeAuthors(info?.authors) || "Unknown Author",
    coverUrl: cover,
    description: info?.description || null,
    pageCount: info?.pageCount || null,
    genres: Array.isArray(info?.categories) ? info.categories : [],
    publishedYear: pubDate.length >= 4 ? pubDate.slice(0, 4) : null,
    publisher: info?.publisher || null,
    googleRating: info?.averageRating || null,
    source: "google",
  };
}

function normalizeApiBook(book) {
  return {
    id: String(book?.id || `book_${Math.random().toString(36).slice(2)}`),
    title: String(book?.title || "Unknown Title"),
    author: String(book?.author || "Unknown Author"),
    coverUrl: book?.coverUrl || null,
    description: book?.description || null,
    pageCount: book?.pageCount || null,
    genres: Array.isArray(book?.genres) ? book.genres : [],
    publishedYear: book?.publishedYear || null,
    publisher: book?.publisher || null,
    googleRating: book?.googleRating || null,
    source: String(book?.source || "catalog"),
  };
}

function extractBooksFromApiResponse(json) {
  if (Array.isArray(json?.books)) return json.books.map(normalizeApiBook);
  if (Array.isArray(json?.items)) return json.items.map(parseGoogleBook);
  return [];
}

function dedupeBooksStable(rows) {
  const seen = new Set();
  const result = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const key = `${String(row?.id || "").trim()}::${String(row?.title || "").trim().toLowerCase()}::${String(row?.author || "").trim().toLowerCase()}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}

function parseGutendexBook(book) {
  const formats = book?.formats || {};
  let cover = null;
  const keys = Object.keys(formats);
  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i].includes("image")) {
      cover = String(formats[keys[i]] || "").replace("http://", "https://");
      break;
    }
  }
  const authors = Array.isArray(book?.authors) ? book.authors : [];
  let author = "Unknown Author";
  if (authors.length) {
    const raw = String(authors[0]?.name || "");
    const parts = raw.split(", ");
    author = parts.length >= 2 ? `${parts[1]} ${parts[0]}`.trim() : raw;
  }
  return {
    id: `gutenberg_${book?.id || Math.random().toString(36).slice(2)}`,
    title: String(book?.title || "Untitled"),
    author,
    coverUrl: cover,
    source: "gutenberg",
    isFree: true,
  };
}

function formatDuration(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds || 0));
  const h = String(Math.floor(safe / 3600)).padStart(2, "0");
  const m = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
  const s = String(Math.floor(safe % 60)).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function truncateText(value, max = 220) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function toStars(value) {
  const rating = Math.max(0, Math.min(5, Number(value || 0)));
  const rounded = Math.round(rating);
  return `${"★".repeat(rounded)}${"☆".repeat(5 - rounded)}`;
}

function fixCoverUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  return raw.replace("http://", "https://").replace("zoom=1", "zoom=3");
}

function firstGenre(genres) {
  if (Array.isArray(genres) && genres.length) return String(genres[0]);
  return "";
}

function renderBookPosterCard(book, opts = {}) {
  const cover = fixCoverUrl(book.coverUrl || book.cover_url);
  const title = escapeHtml(book.title || "Untitled");
  const author = escapeHtml(book.author || "Unknown Author");
  const year = escapeHtml(book.publishedYear || "");
  const genre = escapeHtml(firstGenre(book.genres) || "");
  const rating = book.googleRating != null ? `${Number(book.googleRating).toFixed(1)} ★` : "";
  const footer = [year, genre, rating].filter(Boolean).join(" · ");
  const action = opts.actionHtml || "";
  const routeBook = {
    id: book.id || "",
    title: book.title || "Untitled",
    author: book.author || "Unknown Author",
    coverUrl: cover,
    description: book.description || "",
    publishedYear: book.publishedYear || "",
    publisher: book.publisher || "",
    genres: Array.isArray(book.genres) ? book.genres : [],
    googleRating: book.googleRating ?? null,
  };
  const modalBook = escapeHtml(JSON.stringify(routeBook));
  const shareLink = escapeHtml(buildBookShareUrl(routeBook));
  return `
    <article class="pw-poster-card">
      <button class="pw-poster-media pw-poster-hit" data-book-modal='${modalBook}'>
        ${cover ? `<img src="${escapeHtml(cover)}" alt="${title} cover" loading="lazy" />` : `<div class="pw-poster-fallback">PW</div>`}
      </button>
      <div class="pw-poster-copy">
        <h4>${title}</h4>
        <p>${author}</p>
        ${footer ? `<p class="muted">${footer}</p>` : ""}
        <a href="${shareLink}" data-link-route="/book">Open details</a>
        ${action}
      </div>
    </article>
  `;
}

function encodeBookPayload(book) {
  try {
    return encodeURIComponent(JSON.stringify(book));
  } catch (_) {
    return "";
  }
}

function decodeBookPayload(payload) {
  try {
    const parsed = JSON.parse(decodeURIComponent(String(payload || "")));
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function buildBookShareUrl(book) {
  const stableId = String(book?.id || "").trim();
  const origin = window.location.origin || "";
  if (stableId) {
    return `${origin}/book?id=${encodeURIComponent(stableId)}`;
  }
  const encoded = encodeBookPayload(book);
  return `${origin}/book?data=${encoded}`;
}

function buildBookPageHtml(source) {
  const cover = fixCoverUrl(source.coverUrl);
  const title = escapeHtml(source.title || "Untitled");
  const author = escapeHtml(source.author || "Unknown Author");
  const desc = String(source.description || "").trim();
  const metaLine = [
    source.publishedYear ? escapeHtml(String(source.publishedYear)) : "",
    source.publisher ? escapeHtml(String(source.publisher)) : "",
    Array.isArray(source.genres) && source.genres.length
      ? escapeHtml(source.genres.slice(0, 3).join(", "))
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const ratingText =
    source.googleRating != null ? `${Number(source.googleRating).toFixed(1)} / 5` : "No rating yet";
  const shareUrl = buildBookShareUrl(source);
  const bookForLibrary = {
    id: source.id || null,
    title: source.title || "Untitled",
    author: source.author || "",
    coverUrl: source.coverUrl || null,
  };
  const bookAttr = escapeHtml(JSON.stringify(bookForLibrary));
  return `
    <section class="app-panel">
      <section class="pw-book-page-hero">
        <div class="pw-modal-cover">${
          cover
            ? `<img src="${escapeHtml(cover)}" alt="${title} cover" />`
            : "<div class=\"pw-poster-fallback\">PW</div>"
        }</div>
        <div>
          <h2>${title}</h2>
          <p>${author}</p>
          ${metaLine ? `<p class="muted">${metaLine}</p>` : ""}
          <p class="metric">Community rating: ${escapeHtml(ratingText)}</p>
          <div class="cta-actions">
            <button class="btn btn-outline" id="pw-book-page-copy">Copy share link</button>
            <a class="btn btn-outline" href="${escapeHtml(shareUrl)}">Open original link</a>
            <button type="button" class="btn btn-outline" data-require-auth data-book-page-review data-book='${bookAttr}'>${t("route.book.giveReview", "Give a review")}</button>
            <button type="button" class="btn" data-require-auth data-book-page-add data-book='${bookAttr}'>${t("route.discover.addTbr", "Add to TBR")}</button>
          </div>
        </div>
      </section>
      <article class="app-panel">
        <h3>About this book</h3>
        <p>${escapeHtml(desc || "No description yet.")}</p>
      </article>
    </section>
  `;
}

function ensureBookModal() {
  let modal = document.getElementById("pw-book-modal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = "pw-book-modal";
  modal.className = "pw-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="pw-modal-backdrop" data-modal-close></div>
    <article class="pw-modal-card" role="dialog" aria-modal="true" aria-label="Book details">
      <button class="btn btn-outline pw-modal-close" data-modal-close>Close</button>
      <div class="pw-modal-body" id="pw-modal-body"></div>
    </article>
  `;
  document.body.appendChild(modal);
  return modal;
}

function openBookModal(book) {
  const modal = ensureBookModal();
  const body = modal.querySelector("#pw-modal-body");
  if (!body) return;
  const title = escapeHtml(book.title || "Untitled");
  const author = escapeHtml(book.author || "Unknown Author");
  const cover = fixCoverUrl(book.coverUrl);
  const description = escapeHtml(book.description || "No description yet.");
  const meta = [
    book.publishedYear ? escapeHtml(String(book.publishedYear)) : "",
    book.publisher ? escapeHtml(String(book.publisher)) : "",
    Array.isArray(book.genres) && book.genres.length ? escapeHtml(book.genres.slice(0, 3).join(", ")) : "",
  ].filter(Boolean).join(" · ");
  const rating = book.googleRating != null ? `${Number(book.googleRating).toFixed(1)} / 5` : "No rating yet";
  const shareUrl = buildBookShareUrl(book);
  body.innerHTML = `
    <section class="pw-modal-hero">
      <div class="pw-modal-cover">${cover ? `<img src="${escapeHtml(cover)}" alt="${title} cover" />` : "<div class=\"pw-poster-fallback\">PW</div>"}</div>
      <div>
        <h3>${title}</h3>
        <p>${author}</p>
        ${meta ? `<p class="muted">${meta}</p>` : ""}
        <p class="metric">Community rating: ${escapeHtml(rating)}</p>
      </div>
    </section>
    <section class="app-panel">
      <h4>About this book</h4>
      <p>${description}</p>
    </section>
    <section class="app-panel">
      <h4>Where to find it</h4>
      <p>Use Discover search for editions and external links, then add it to your shelf.</p>
      <div class="cta-actions">
        <a class="btn btn-outline" href="${escapeHtml(shareUrl)}" data-link-route="/book">Open full page</a>
        <button class="btn btn-outline" id="pw-book-copy-link">Copy share link</button>
      </div>
    </section>
  `;
  const copyBtn = body.querySelector("#pw-book-copy-link");
  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showBanner("success", "Book link copied.");
    } catch (_) {
      showBanner("error", "Could not copy link.");
    }
  });
  modal.hidden = false;
  document.body.classList.add("pw-modal-open");
}

function closeBookModal() {
  const modal = document.getElementById("pw-book-modal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("pw-modal-open");
}

async function upsertUserBookStatus(supabase, userId, book, status) {
  const payload = {
    user_id: userId,
    status,
    book_id: book.id || null,
    title: book.title || "Untitled",
    author: normalizeAuthors(book.authors || book.author) || null,
    cover_url: book.cover_url || book.coverUrl || null,
  };
  const upsertRes = await supabase
    .from("user_books")
    .upsert(payload, { onConflict: "user_id,title" });
  if (!upsertRes.error) return;

  const { data: existing, error: existingErr } = await supabase
    .from("user_books")
    .select("id")
    .eq("user_id", userId)
    .eq("title", payload.title)
    .maybeSingle();
  if (existingErr) throw existingErr;

  if (existing?.id) {
    const { error: updateErr } = await supabase
      .from("user_books")
      .update(payload)
      .eq("id", existing.id);
    if (updateErr) throw updateErr;
    return;
  }

  const { error: insertErr } = await supabase
    .from("user_books")
    .insert(payload);
  if (insertErr) throw insertErr;
}

/** Loads reviews, then profiles in a second query (avoids nested select issues with RLS). */
async function fetchReviewsWithAuthorRows(supabase, limit) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, user_id, title, review_text, rating, content, star_rating, created_at, book_title, book_author")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!data?.length) return [];
  const userIds = [...new Set(data.map((r) => r.user_id).filter(Boolean))];
  if (!userIds.length) {
    return data.map((r) => ({ ...r, profiles: null }));
  }
  const { data: profs, error: pErr } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);
  if (pErr) {
    return data.map((r) => ({ ...r, profiles: null }));
  }
  const byId = Object.fromEntries((profs || []).map((p) => [p.id, p]));
  return data.map((r) => ({ ...r, profiles: byId[r.user_id] || null }));
}

async function renderHome(_supabase, _session) {
  const [trendingBooks, latestReviews] = await Promise.all([
    runSafeQuery(async () => {
      const json = await fetchJson("/api/books?type=trending");
      return extractBooksFromApiResponse(json).slice(0, 6);
    }, "Trending unavailable."),
    runSafeQuery(async () => {
      const supabase = await getSupabase();
      return fetchReviewsWithAuthorRows(supabase, 4);
    }, "Reviews unavailable."),
  ]);
  const trendRows = trendingBooks.filter((x) => !x.__error);
  const reviewRows = latestReviews.filter((x) => !x.__error);
  return `
    <section class="hero">
      <div class="hero-inner">
        <h1>
          <span>${t("home.heroLine1", "Walk your shelves.")}</span><br />
          <span class="accent">${t("home.heroLine2", "Share the story.")}</span>
        </h1>
        <p class="lede">${t("home.heroLede", "Your cozy corner for TBR piles, reading streaks, spicy reviews, and book-club chaos — all the bookish energy, none of the pirated pages.")}</p>
        <div class="hero-actions">
          <a class="badge-play" href="https://play.google.com/store/apps/details?id=com.pagewalker.app" rel="noopener noreferrer" aria-label="${t("home.playAlt", "Get it on Google Play")}">
            <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="${t("home.playAlt", "Get it on Google Play")}" width="646" height="250" />
          </a>
        </div>
        <p class="hero-tagline">${t("home.heroTagline", "Free on Google Play · same login here & in the app")}</p>
      </div>
    </section>
    <section class="app-panel pw-editorial">
      <p class="pw-kicker">The Pagewalker edit</p>
      <h2>A reading home inspired by your best ideas</h2>
      <p>Discover books in a poster-first view, keep a diary of your reading life, and share reviews with your community in one place.</p>
    </section>
    <section class="app-panel">
      <div class="pw-section-head">
        <h3>Hot this week</h3>
        <a href="/discover" data-link-route="/discover">See more</a>
      </div>
      <div class="pw-poster-grid">
        ${trendRows.map((book) => renderBookPosterCard(book)).join("")}
      </div>
    </section>
    <section class="app-panel">
      <div class="pw-section-head">
        <h3>Reader buzz</h3>
        <a href="/social" data-link-route="/social">Go to Social</a>
      </div>
      <p class="muted pw-section-note">${t(
        "home.readerBuzzExplainer",
        "Recent reviews from other readers. Open Social for the full feed. Trending books and search are on Discover.",
      )}</p>
      <div class="pw-review-feed">
        ${reviewRows.length ? reviewRows.map((review) => `
          <article class="pw-review-row">
            <p><strong>${escapeHtml(review.book_title || review.title || "Book")}</strong> · ${toStars(review.rating)}</p>
            <p>${escapeHtml(truncateText(review.review_text || "", 130))}</p>
            <p class="muted">by ${escapeHtml(review.profiles?.display_name || review.profiles?.username || "Reader")}</p>
          </article>
        `).join("") : `<p class="muted">Reviews will appear here as readers post.</p>`}
      </div>
    </section>
    <section class="cta-band">
      <div class="cta-inner">
        <h2>${t("home.ctaHeading", "Start your next chapter")}</h2>
        <p class="cta-lede">${t("home.ctaLede", "Get the app on Google Play, read release notes, or reach out for support.")}</p>
        <div class="cta-actions">
          <a class="btn" href="https://play.google.com/store/apps/details?id=com.pagewalker.app" rel="noopener noreferrer">${t("home.ctaPlay", "Get it on Google Play")}</a>
          <a class="btn btn-outline" href="/updates">${t("home.ctaUpdates", "Read updates")}</a>
          <a class="btn btn-outline" href="/about">${t("nav.about", "About")}</a>
        </div>
      </div>
    </section>
  `;
}

async function renderDiscover(supabase, session) {
  const safeQuery = discoverQuery.trim();
  const loadGooglePages = async (baseUrl, pages) => {
    const reqs = [];
    for (let i = 0; i < pages; i += 1) {
      const startIndex = i * DISCOVER_PAGE_SIZE;
      reqs.push(fetchJson(`${baseUrl}&startIndex=${startIndex}&maxResults=${DISCOVER_PAGE_SIZE}`));
    }
    const responses = await Promise.all(reqs);
    const books = dedupeBooksStable(responses.flatMap((x) => extractBooksFromApiResponse(x)));
    const last = responses[responses.length - 1] || {};
    const hasMore =
      typeof last?.hasMore === "boolean"
        ? last.hasMore
        : Number(last?.totalItems || 0) > books.length;
    return { books, hasMore };
  };
  const loadClassicsPages = async (pages) => {
    const reqs = [];
    for (let i = 1; i <= pages; i += 1) {
      reqs.push(fetchJson(`/api/books?type=classics&page=${i}`));
    }
    const responses = await Promise.all(reqs);
    const books = dedupeBooksStable(responses.flatMap((x) => x.results || []).map(parseGutendexBook));
    const hasMore = Boolean(responses[responses.length - 1]?.next);
    return { books, hasMore };
  };

  const [trendingBooks, genreBooks, searchBooks, freeClassics] = await Promise.all([
    runSafeQuery(() => loadGooglePages("/api/books?type=trending", discoverPaging.trendingPage), t("route.discover.trendingFallback", "Trending data is not available yet.")),
    runSafeQuery(() => {
      const g = encodeURIComponent(discoverGenre);
      return loadGooglePages(`/api/books?type=genre&genre=${g}`, discoverPaging.genrePage);
    }, t("route.discover.trendingFallback", "Trending data is not available yet.")),
    runSafeQuery(async () => {
      if (!safeQuery) return { books: [], hasMore: false };
      const q = encodeURIComponent(safeQuery);
      return loadGooglePages(`/api/books?type=search&q=${q}`, discoverPaging.searchPage);
    }, t("route.discover.trendingFallback", "Trending data is not available yet.")),
    runSafeQuery(() => loadClassicsPages(discoverPaging.classicsPage), t("route.discover.trendingFallback", "Trending data is not available yet.")),
  ]);
  const activeBooks = safeQuery ? searchBooks : genreBooks;
  const trendingRows = (trendingBooks?.books || []).filter((b) => !b.__error);
  const activeRows = (activeBooks?.books || []).filter((b) => !b.__error);
  const classicsRows = (freeClassics?.books || []).filter((b) => !b.__error);
  const activeHasMore = safeQuery ? !!searchBooks?.hasMore : !!genreBooks?.hasMore;
  const genres = ["romance", "mystery", "adventure", "horror", "fantasy", "history", "drama", "sci-fi"];
  const moodInPreset = Boolean(discoverMood && DISCOVER_MOOD_PRESETS.includes(discoverMood));
  const moodSelectValue = !discoverMood ? "" : moodInPreset ? discoverMood : "__custom";
  const moodCustomValue = !moodInPreset && discoverMood ? discoverMood : "";

  return `
    <section class="app-panel">
      <h2>${t("route.discover.title", "Discover & search")}</h2>
      <p>${t("route.discover.body", "Browse catalog books and use app search from web.")}</p>
      <div class="pw-discover-tools">
        <div class="pw-discover-tiles">
          <article class="app-panel pw-discover-tile">
            <h3 class="pw-discover-tile__title">${t("route.discover.searchLabel", "Search books")}</h3>
            <form id="pw-discover-search" class="pw-discover-tile__body form-stack">
              <label>
                <span class="pw-discover-sr-only">${t("route.discover.searchLabel", "Search books")}</span>
                <input id="pw-discover-query" type="search" autocomplete="off" value="${escapeHtml(safeQuery)}" placeholder="${t("route.discover.searchPlaceholder", "Search by title")}" />
              </label>
              <button type="submit" class="btn">${t("route.discover.searchAction", "Search")}</button>
            </form>
          </article>
          <article class="app-panel pw-discover-tile">
            <h3 class="pw-discover-tile__title">${t("route.discover.moodTitle", "What's your vibe?")}</h3>
            <form id="pw-mood-form" class="pw-discover-tile__body form-stack">
              <label class="form-stack" style="gap:0.35rem">
                <span class="pw-discover-sr-only">${t("route.discover.moodInputLabel", "Mood")}</span>
                <select id="pw-mood-select" class="pw-select" aria-label="${escapeHtml(t("route.discover.moodTitle", "What's your vibe?"))}">
                  <option value="">${t("route.discover.moodSelectHint", "Choose a vibe…")}</option>
                  ${DISCOVER_MOOD_PRESETS.map(
                    (m) =>
                      `<option value="${escapeHtml(m)}"${moodSelectValue === m ? " selected" : ""}>${escapeHtml(m)}</option>`,
                  ).join("")}
                  <option value="__custom" ${moodSelectValue === "__custom" ? " selected" : ""}>${t("route.discover.moodCustom", "Custom…")}</option>
                </select>
                <input
                  id="pw-mood-input"
                  type="text"
                  class="pw-mood-custom-input"
                  value="${escapeHtml(moodCustomValue)}"
                  placeholder="${t("route.discover.moodPlaceholder", "Describe your mood")}"
                  ${moodSelectValue === "__custom" ? "" : " hidden"}
                />
              </label>
              <button type="submit" class="btn">${t("route.discover.moodAction", "Find my next read")}</button>
            </form>
          </article>
        </div>
        <div id="pw-mood-results" class="pw-mood-results-below"></div>
      </div>
      <article class="app-panel">
        <h3>🔥 ${t("route.discover.trendingTitle", "Trending now")}</h3>
        <div class="pw-poster-grid">
          ${trendingRows.map((book) => renderBookPosterCard(book, {
            actionHtml: `<div class="cta-actions"><button type="button" class="btn btn-outline" data-require-auth data-discover-add data-status="tbr" data-book='${escapeHtml(JSON.stringify(book))}'>${t("route.discover.addTbr", "Add to TBR")}</button></div>`,
          })).join("")}
        </div>
        ${trendingBooks?.hasMore ? `<div class="cta-actions"><button class="btn btn-outline" data-discover-more="trending">Load more</button></div>` : ""}
      </article>
      <article class="app-panel">
        <h3>${t("route.discover.genreTitle", "Explore by genre")}</h3>
        <div class="cta-actions">
          ${genres.map((g) => `<button class="btn btn-outline" data-genre-chip="${escapeHtml(g)}">${escapeHtml(g)}</button>`).join("")}
        </div>
      </article>
      <div class="pw-poster-grid">
        ${
          activeRows.map((book) => {
            return renderBookPosterCard(book, {
              actionHtml: `<div class="cta-actions">
                <button type="button" class="btn btn-outline" data-require-auth data-discover-add data-status="tbr" data-book='${escapeHtml(JSON.stringify(book))}'>${t("route.discover.addTbr", "Add to TBR")}</button>
                <button type="button" class="btn btn-outline" data-require-auth data-discover-add data-status="reading" data-book='${escapeHtml(JSON.stringify(book))}'>${t("route.discover.addReading", "Mark Reading")}</button>
              </div>`,
            });
          }).join("")
        }
      </div>
      ${activeHasMore ? `<div class="cta-actions"><button class="btn btn-outline" data-discover-more="${safeQuery ? "search" : "genre"}">Load more</button></div>` : ""}
      <article class="app-panel">
        <h3>📖 ${t("route.discover.freeClassics", "Free classics")}</h3>
        <div class="pw-poster-grid">
          ${classicsRows.map((book) => renderBookPosterCard(book, {
            actionHtml: `<p class="metric">${t("route.discover.freeBadge", "Free")}</p>`,
          })).join("")}
        </div>
        ${freeClassics?.hasMore ? `<div class="cta-actions"><button class="btn btn-outline" data-discover-more="classics">Load more</button></div>` : ""}
      </article>
      <p class="muted">${
        session?.user
          ? t("route.discover.noteAuthed", "You are signed in. Use discover + library together.")
          : t("route.discover.noteGuest", "Sign in to save books to your TBR and library.")
      }</p>
    </section>
  `;
}

async function renderLibrary(supabase, session) {
  if (!session?.user) {
    return `<section class="app-panel"><h2>${t("route.library.title", "Library")}</h2><p>${t("route.authRequired", "Please sign in to view this section.")}</p></section>`;
  }
  const rows = await runSafeQuery(async () => {
    const reqs = [];
    for (let i = 0; i < libraryPage; i += 1) {
      const from = i * LIBRARY_PAGE_SIZE;
      const to = from + LIBRARY_PAGE_SIZE - 1;
      reqs.push(
        supabase
          .from("user_books")
          .select("id, status, title, author, book_id, created_at, books(id,title,author,cover_url,description,page_count,genre)")
          .eq("user_id", session.user.id)
          .order("updated_at", { ascending: false })
          .range(from, to),
      );
    }
    const responses = await Promise.all(reqs);
    const merged = [];
    for (let i = 0; i < responses.length; i += 1) {
      if (responses[i].error) throw responses[i].error;
      merged.push(...(responses[i].data || []));
    }
    return merged;
  }, t("appShell.missingUserBooks", "Could not load user_books."));
  const cleanRows = rows.filter((r) => !r.__error).map((r) => {
    const b = r.books || {};
    return {
      ...r,
      title: r.title || b.title || "Untitled",
      author: r.author || b.author || "",
      cover_url: b.cover_url || null,
    };
  });
  const counts = LIBRARY_STATUSES.reduce((acc, status) => {
    acc[status] = cleanRows.filter((x) => x.status === status).length;
    return acc;
  }, {});
  const filteredRows = libraryFilter === "all"
    ? cleanRows
    : cleanRows.filter((x) => x.status === libraryFilter);
  const hasMoreLibrary = cleanRows.length >= libraryPage * LIBRARY_PAGE_SIZE;

  return `
    <section class="app-panel">
      <h2>${t("route.library.title", "Library")}</h2>
      <p class="muted">${t("route.library.explainer", "This is your reading shelf. Add books from Discover, then move them across TBR, Reading, Read, and DNF.")}</p>
      <div class="cta-actions pw-sticky-bar">
        <button class="btn btn-outline" data-library-filter="all">${t("route.library.filterAll", "All")} (${cleanRows.length})</button>
        ${LIBRARY_STATUSES.map((status) => `<button class="btn btn-outline" data-library-filter="${status}">${STATUS_LABELS[status]} (${counts[status] || 0})</button>`).join("")}
      </div>
      ${filteredRows.length ? "" : `<p class="muted">${t("route.library.emptyHint", "No books in this shelf yet. Add one from Discover.")}</p>`}
      <div class="pw-poster-grid">
        ${
          filteredRows.map((r) => renderBookPosterCard({
            id: r.book_id || "",
            title: r.title,
            author: r.author,
            cover_url: r.cover_url,
          }, {
            actionHtml: `<p class="metric">${t("route.library.status", "Status")}: ${escapeHtml(STATUS_LABELS[r.status] || r.status || "-")}</p>
            <div class="cta-actions">
              ${LIBRARY_STATUSES.map((status) => `<button class="btn btn-outline" data-library-status="${status}" data-library-title="${escapeHtml(r.title || "")}">${STATUS_LABELS[status]}</button>`).join("")}
            </div>`,
          })).join("")
        }
      </div>
      ${hasMoreLibrary ? `<div class="cta-actions"><button class="btn btn-outline" data-library-more>Load more</button></div>` : ""}
      ${rows.some((r) => r.__error) ? `<p class="muted">${escapeHtml(rows.find((r) => r.__error)?.text || "")}</p>` : ""}
    </section>
  `;
}

async function renderSocial(supabase, session) {
  if (!session?.user) {
    return `<section class="app-panel"><h2>${t("route.social.title", "Reviews & social")}</h2><p>${t("route.authRequired", "Please sign in to view this section.")}</p></section>`;
  }
  const reviews = await runSafeQuery(
    () => fetchReviewsWithAuthorRows(supabase, 25),
    t("appShell.missingReviews", "Could not load reviews."),
  );
  const hasDraft = Boolean(
    (socialDraft.title && String(socialDraft.title).trim()) ||
      (socialDraft.body && String(socialDraft.body).trim()),
  );
  const showComposer = socialComposerExpanded || hasDraft;
  const cards = reviews.map((r) => {
    if (r.__error) return `<article class="app-panel"><p>${escapeHtml(r.text)}</p></article>`;
    const title = r.title || r.book_title || t("route.social.reviewTitle", "Review");
    const body = r.review_text || r.content || "";
    const ratingValue = r.rating ?? r.star_rating ?? "-";
    const displayName =
      r.profiles?.display_name ||
      r.profiles?.username ||
      t("route.social.anonymous", "Reader");
    const isMine = r.user_id && r.user_id === session.user.id;
    return `
      <article class="app-panel pw-review-card">
        <p class="muted">${escapeHtml(displayName)} reviewed</p>
        <h3>${escapeHtml(title)}</h3>
        <p class="metric">${toStars(ratingValue)} · ${escapeHtml(String(ratingValue))}/5</p>
        <p data-review-full hidden>${escapeHtml(body)}</p>
        <p data-review-short>${escapeHtml(truncateText(body, 220))}</p>
        ${String(body).length > 220 ? `<button class="btn btn-outline" data-review-toggle>Read more</button>` : ""}
        <div class="pw-review-actions">
          <span>Like</span><span>Comment</span><span>Spoiler</span>
        </div>
        ${isMine ? `<div class="cta-actions"><button class="btn btn-outline" data-social-edit="${escapeHtml(r.id)}" data-social-title="${escapeHtml(title)}" data-social-body="${escapeHtml(body)}" data-social-rating="${escapeHtml(String(ratingValue === "-" ? 5 : ratingValue))}">${t("route.social.edit", "Edit")}</button><button class="btn btn-outline" data-social-delete="${escapeHtml(r.id)}">${t("route.social.delete", "Delete")}</button></div>` : ""}
      </article>
    `;
  });

  return `
    <section class="app-panel">
      <h2>${t("route.social.title", "Reviews & social")}</h2>
      <p class="muted pw-social-feed-intro">${t(
        "route.social.feedIntro",
        "Member reviews below (newest first). Discover has trending and search. Home shows a short preview in Reader buzz. No per-book page on web yet.",
      )}</p>
      <div class="pw-social-composer">
        <button
          type="button"
          id="pw-social-composer-toggle"
          class="btn btn-outline pw-social-composer__toggle"
          aria-expanded="${showComposer ? "true" : "false"}"
          aria-controls="pw-social-composer-panel"
        >
          ${t("route.social.writeReviewToggle", "Write a review")}
        </button>
        <div id="pw-social-composer-panel" class="pw-social-composer__panel" ${showComposer ? "" : "hidden"}>
          <p class="muted pw-social-composer__hint">${t(
            "route.social.composerHint",
            "Choose the book, add stars, and write your take.",
          )}</p>
          <form id="pw-social-form" class="form-stack">
            <label>
              <span>${t("route.social.formTitle", "Book or review title")}</span>
              <input id="pw-social-title" type="text" value="${escapeHtml(socialDraft.title)}" maxlength="140" required />
            </label>
            <label>
              <span>${t("route.social.formBody", "Your review")}</span>
              <textarea id="pw-social-body" rows="4" maxlength="1000" required>${escapeHtml(socialDraft.body)}</textarea>
            </label>
            <label>
              <span>${t("route.social.formRating", "Rating")}</span>
              <select id="pw-social-rating" class="pw-select">
                ${[1, 2, 3, 4, 5]
                  .map(
                    (x) =>
                      `<option value="${x}"${String(x) === String(socialDraft.rating) ? " selected" : ""}>${x}</option>`,
                  )
                  .join("")}
              </select>
            </label>
            <div class="cta-actions">
              <button type="submit" class="btn">${t("route.social.publish", "Publish review")}</button>
              <input id="pw-social-edit-id" type="hidden" value="" />
            </div>
          </form>
        </div>
      </div>
      <h3 class="pw-social-feed__heading">${t("route.social.feedSectionTitle", "From readers")}</h3>
      <div class="app-grid app-grid-3">
        ${cards.join("")}
      </div>
      <p class="muted">${t("route.social.authed", "Use the mobile app and web together with the same account.")}</p>
    </section>
  `;
}

function renderClubCardFooter(c, { myRole, requestStatus, atCapacity }) {
  if (c.__error) return "";
  const isListed = c.is_private === false;
  if (myRole) {
    return `<p class="muted pw-club-card__state">${t("route.clubs.inClub", "You are in this club.")} · ${t("route.clubs.yourRole", "Your role")}: ${escapeHtml(
      myRole,
    )}</p>`;
  }
  if (!isListed) {
    return `<p class="muted">${t("route.clubs.inviteOnlyCard", "Invite only — get a code from a member to join.")}</p>`;
  }
  if (atCapacity) {
    return `<p class="muted">${t("route.clubs.clubFull", "This club is full.")}</p>`;
  }
  if (requestStatus === "pending") {
    return `<button type="button" class="btn btn-outline" disabled>${t("route.clubs.requestPending", "Request sent")}</button>`;
  }
  if (requestStatus === "rejected") {
    return `<button type="button" class="btn btn-outline" data-club-rejoin="${escapeHtml(c.id)}">${t("route.clubs.requestAgain", "Ask again")}</button>`;
  }
  return `<button type="button" class="btn" data-club-request="${escapeHtml(c.id)}">${t("route.clubs.requestToJoin", "Request to join")}</button>`;
}

/** Create / join forms — used on Profile → Book clubs tab (not on /clubs browse). */
function renderClubSetupFormsHtml() {
  return `
      <div class="app-grid app-grid-2 pw-club-forms">
        <article class="app-panel">
          <h3>${t("route.clubs.createTitle", "Create a club")}</h3>
          <form id="pw-club-create-form" class="form-stack">
            <label><span>${t("route.clubs.clubName", "Club name")}</span><input id="pw-club-name" type="text" maxlength="120" value="${escapeHtml(
              clubsDraft.name,
            )}" required /></label>
            <label><span>${t("route.clubs.clubDescription", "Description")}</span><textarea id="pw-club-description" rows="3" maxlength="500">${escapeHtml(
              clubsDraft.description,
            )}</textarea></label>
            <label><span>${t("route.clubs.clubEmoji", "Emoji")}</span><input id="pw-club-emoji" type="text" maxlength="2" value="${escapeHtml(
              clubsDraft.emoji,
            )}" /></label>
            <label><span>${t("route.clubs.maxMembers", "Max members")}</span><select id="pw-club-max-members" class="pw-select"><option value="5"${clubsDraft.maxMembers === "5" ? " selected" : ""}>5</option><option value="10"${clubsDraft.maxMembers === "10" ? " selected" : ""}>10</option><option value="20"${clubsDraft.maxMembers === "20" ? " selected" : ""}>20</option></select></label>
            <label class="pw-checkbox">
              <input type="checkbox" id="pw-club-directory" checked />
              <span>${t("route.clubs.listInDirectory", "List in directory (others can request to join)")}</span>
            </label>
            <button type="submit" class="btn">${t("route.clubs.createAction", "Create club")}</button>
          </form>
        </article>
        <article class="app-panel">
          <h3>${t("route.clubs.joinTitle", "Join with invite code")}</h3>
          <form id="pw-club-join-form" class="form-stack">
            <label><span>${t("route.clubs.inviteCode", "Invite code")}</span><input id="pw-club-invite-code" type="text" maxlength="30" value="${escapeHtml(
              clubsDraft.inviteCode,
            )}" placeholder="A1B2C3D4" required /></label>
            <button type="submit" class="btn btn-outline">${t("route.clubs.joinAction", "Join club")}</button>
          </form>
        </article>
      </div>
      <p class="muted pw-profile-club-hint">${t("route.profile.clubSetupHint", "Then open Clubs in the app menu to browse and enter your club’s forum.")}</p>
  `;
}

function bindProfileTabActions() {
  const buttons = document.querySelectorAll("[data-profile-tab]");
  const acc = document.getElementById("pw-profile-panel-account");
  const cl = document.getElementById("pw-profile-panel-clubs");
  for (let i = 0; i < buttons.length; i += 1) {
    buttons[i].addEventListener("click", () => {
      const tab = buttons[i].getAttribute("data-profile-tab") || "account";
      const u = new URL(window.location.href);
      if (tab === "clubs") u.searchParams.set("tab", "clubs");
      else u.searchParams.delete("tab");
      const qs = u.searchParams.toString();
      window.history.pushState({}, "", u.pathname + (qs ? `?${qs}` : ""));
      for (let j = 0; j < buttons.length; j += 1) {
        const id = buttons[j].getAttribute("data-profile-tab");
        buttons[j].setAttribute("aria-selected", id === tab ? "true" : "false");
      }
      if (acc) acc.hidden = tab !== "account";
      if (cl) cl.hidden = tab !== "clubs";
    });
  }
}

async function renderClubDetail(supabase, session) {
  if (!session?.user) {
    return `<section class="app-panel"><h2>${t("route.clubs.title", "Book clubs")}</h2><p>${t("route.authRequired", "Please sign in to view this section.")}</p></section>`;
  }
  const params = new URLSearchParams(window.location.search);
  const clubId = String(params.get("id") || "").trim();
  if (!clubId) {
    return `<section class="app-panel"><h2>${t("route.clubs.clubForum", "Club")}</h2><p class="muted">${t("route.clubs.missingId", "Missing club. Go back to Clubs.")}</p><p><a href="/clubs" data-link-route="/clubs">${t("route.clubs.backToClubs", "Back to clubs")}</a></p></section>`;
  }
  const { data: club, error: clubErr } = await supabase
    .from("book_clubs")
    .select("id, name, description, cover_emoji, invite_code, max_members, created_by, is_private, current_book_id, member_count, created_at")
    .eq("id", clubId)
    .maybeSingle();
  if (clubErr || !club) {
    return `<section class="app-panel"><h2>${t("route.clubs.clubForum", "Club")}</h2><p>${t("route.clubs.loadFailed", "We could not load this club.")}</p><p><a href="/clubs" data-link-route="/clubs">${t("route.clubs.backToClubs", "Back to clubs")}</a></p></section>`;
  }
  const { data: myMember } = await supabase
    .from("book_club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", session.user.id)
    .maybeSingle();
  const isMember = Boolean(myMember);
  const isCreator = club.created_by === session.user.id;

  const { data: msgRows, error: msgErr } = await supabase
    .from("book_club_messages")
    .select("id, user_id, content, message_type, chapter_ref, created_at, contains_spoiler")
    .eq("club_id", clubId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (msgErr) {
    return `<section class="app-panel"><h2>${escapeHtml(club.name || "Club")}</h2><p>${t("appShell.missingData", "Something went wrong.")}</p></section>`;
  }
  const messages = msgRows || [];
  const uids = [...new Set(messages.map((m) => m.user_id))];
  let nameBy = {};
  if (uids.length) {
    const { data: profs } = await supabase.from("profiles").select("id, display_name, username").in("id", uids);
    nameBy = Object.fromEntries((profs || []).map((p) => [p.id, p.display_name || p.username || String(p.id).slice(0, 6)]));
  }
  const back = `<p class="pw-club-detail__back"><a href="/clubs" data-link-route="/clubs">← ${t("route.clubs.backToClubs", "Back to clubs")}</a></p>`;
  const head = `
    <header class="pw-club-detail__head app-panel">
      <p class="pw-club-detail__emoji">${escapeHtml(club.cover_emoji || "📚")}</p>
      <h2>${escapeHtml(club.name || t("route.clubs.unnamed", "Club"))}</h2>
      <p class="pw-club-detail__desc">${escapeHtml(club.description || "")}</p>
      <p class="metric">${t("route.clubs.members", "Members")}: ${Number(club.member_count || 0)}/${Number(club.max_members || 20)}</p>
      ${isCreator || isMember ? `<p class="muted">${t("route.clubs.code", "Code")}: ${escapeHtml(club.invite_code || "—")}</p>` : ""}
    </header>
  `;
  if (!isMember) {
    return `
      <section class="app-panel pw-club-detail">
        ${back}
        ${head}
        <p class="muted">${t("route.clubs.forumMemberOnly", "Join this club to read and post in the book forum. Use Profile → Book clubs to join with a code, or request access from the club card on Browse.")}</p>
      </section>
    `;
  }
  const meId = session.user.id;
  const fmtTime = (iso) => {
    try {
      return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      return String(iso || "");
    }
  };
  const msgBubbles = messages.length
    ? messages
        .map((m) => {
          const isMe = m.user_id === meId;
          const who = escapeHtml(nameBy[m.user_id] || "?");
          const time = escapeHtml(fmtTime(m.created_at));
          const chip =
            m.chapter_ref != null
              ? `<span class="pw-club-chat__chip">${t("route.clubs.chapter", "Ch.")} ${escapeHtml(String(m.chapter_ref))}</span>`
              : "";
          return `
        <li class="pw-club-chat__row${isMe ? " pw-club-chat__row--me" : ""}">
          <div class="pw-club-chat__bubble">
            <div class="pw-club-chat__bubble-meta">
              <span class="pw-club-chat__who">${isMe ? t("route.clubs.chatYou", "You") : who}</span>
              ${chip}
              <time class="pw-club-chat__time" datetime="${escapeHtml(m.created_at || "")}">${time}</time>
            </div>
            <p class="pw-club-chat__text">${m.contains_spoiler ? `<em class="pw-club-chat__spoiler-flag">${t("route.clubs.spoiler", "Spoiler")}</em> ` : ""}${escapeHtml(m.content || "")}</p>
          </div>
        </li>`;
        })
        .join("")
    : "";
  return `
    <section class="app-panel pw-club-detail">
      ${back}
      ${head}
      <h3 class="pw-club-chat__title">${t("route.clubs.chatTitle", "Group chat")}</h3>
      <p class="muted pw-club-chat__hint">${t(
        "route.clubs.chatHint",
        "Everyone in the club can read and post here. New messages appear at the bottom—scroll up for older ones.",
      )}</p>
      <div class="pw-club-chat" aria-label="${t("route.clubs.chatTitle", "Group chat")}">
        <div id="pw-club-chat-scroll" class="pw-club-chat__scroll" tabindex="0" role="log" aria-relevant="additions" aria-live="polite">
          ${
            messages.length
              ? `<ol class="pw-club-chat__list">${msgBubbles}</ol>`
              : `<p class="pw-club-chat__empty muted">${t("route.clubs.chatEmpty", "No messages yet. Say hi below—others will see it here, like a group chat.")}</p>`
          }
        </div>
        <form id="pw-club-forum-form" class="pw-club-chat__composer" autocomplete="off">
          <div class="pw-club-chat__input-wrap">
            <label class="visually-hidden" for="pw-club-forum-body">${t("route.clubs.forumMessage", "Message")}</label>
            <textarea
              id="pw-club-forum-body"
              class="pw-club-chat__textarea"
              rows="3"
              maxlength="2000"
              required
              placeholder="${t("route.clubs.chatPlaceholder", "Message the group…")}"
            ></textarea>
            <button type="submit" class="btn pw-club-chat__send" aria-label="${t("route.clubs.send", "Send")}">${t("route.clubs.send", "Send")}</button>
          </div>
          <details class="pw-club-chat__options">
            <summary>${t("route.clubs.chatOptions", "Chapter & spoiler")}</summary>
            <div class="pw-club-chat__options-row">
              <label><span>${t("route.clubs.chapterRef", "Chapter (optional)")}</span><input id="pw-club-forum-chapter" type="number" min="0" step="1" placeholder="0" /></label>
              <label class="pw-checkbox">
                <input type="checkbox" id="pw-club-forum-spoiler" />
                <span>${t("route.clubs.markSpoiler", "Mark as spoiler")}</span>
              </label>
            </div>
          </details>
          <input type="hidden" id="pw-club-forum-club-id" value="${escapeHtml(clubId)}" />
        </form>
      </div>
    </section>
  `;
}

function bindClubDetailActions(supabase, session, rerender) {
  const form = document.getElementById("pw-club-forum-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const clubId = document.getElementById("pw-club-forum-club-id")?.value || "";
    const body = String(document.getElementById("pw-club-forum-body")?.value || "").trim();
    const chRaw = document.getElementById("pw-club-forum-chapter")?.value;
    const chapterRef = chRaw === "" || chRaw == null ? null : Math.max(0, parseInt(chRaw, 10) || 0);
    const spoiler = Boolean(document.getElementById("pw-club-forum-spoiler")?.checked);
    if (!clubId || !body) return;
    try {
      const { data: freshAuth, error: se } = await supabase.auth.getSession();
      if (se) throw se;
      const uid = freshAuth?.session?.user?.id;
      if (!uid) throw new Error("sign_in");
      const { error } = await supabase.from("book_club_messages").insert({
        club_id: clubId,
        user_id: uid,
        content: body,
        message_type: "text",
        contains_spoiler: spoiler,
        chapter_ref: chapterRef,
      });
      if (error) throw error;
      rerender();
    } catch (error) {
      showBanner("error", error?.message || t("appShell.missingData", "Something went wrong."));
    }
  });
}

async function renderClubs(supabase, session) {
  if (!session?.user) {
    return `<section class="app-panel"><h2>${t("route.clubs.title", "Book clubs")}</h2><p>${t("route.authRequired", "Please sign in to view this section.")}</p></section>`;
  }

  const clubs = await runSafeQuery(async () => {
    const { data, error } = await supabase
      .from("book_clubs")
      .select("id, name, description, invite_code, cover_emoji, max_members, created_by, is_private, member_count")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  }, t("appShell.missingClubs", "Could not load book_clubs."));

  const cleanClubs = clubs.filter((c) => !c.__error);
  const clubIds = cleanClubs.map((c) => c.id);
  const myCreatedIds = cleanClubs.filter((c) => c.created_by === session.user.id).map((c) => c.id);

  let myMemberships = await runSafeQuery(async () => {
    const { data, error } = await supabase
      .from("book_club_members")
      .select("club_id, role")
      .eq("user_id", session.user.id);
    if (error) throw error;
    return data || [];
  }, "");
  if (Array.isArray(myMemberships) && myMemberships[0]?.__error) {
    myMemberships = [];
  }
  const myRoleByClub = Object.fromEntries(
    (Array.isArray(myMemberships) ? myMemberships : [])
      .filter((r) => r && !r.__error)
      .map((m) => [m.club_id, m.role || "member"]),
  );

  let myRequestByClub = {};
  const reqRows = await runSafeQuery(async () => {
    const { data, error } = await supabase
      .from("book_club_join_requests")
      .select("club_id, status")
      .eq("user_id", session.user.id);
    if (error) throw error;
    return data || [];
  }, "");
  if (Array.isArray(reqRows) && !reqRows[0]?.__error) {
    myRequestByClub = Object.fromEntries(reqRows.filter((r) => r && !r.__error).map((r) => [r.club_id, r.status]));
  }

  let incomingRows = [];
  if (myCreatedIds.length) {
    const inc = await runSafeQuery(async () => {
      const { data, error } = await supabase
        .from("book_club_join_requests")
        .select("id, club_id, user_id, status, created_at")
        .eq("status", "pending")
        .in("club_id", myCreatedIds);
      if (error) throw error;
      return data || [];
    }, "");
    if (Array.isArray(inc) && !inc[0]?.__error) {
      const rows = inc.filter((r) => r && !r.__error);
      const uids = [...new Set(rows.map((r) => r.user_id))];
      let profById = {};
      if (uids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, display_name, username").in("id", uids);
        profById = Object.fromEntries((profs || []).map((p) => [p.id, p]));
      }
      const nameByClub = Object.fromEntries(cleanClubs.map((c) => [c.id, c.name]));
      incomingRows = rows.map((r) => ({
        ...r,
        _clubName: nameByClub[r.club_id] || t("route.clubs.unnamed", "Club"),
        _uname:
          profById[r.user_id]?.display_name || profById[r.user_id]?.username || String(r.user_id).slice(0, 6),
      }));
    }
  }

  const incomingBlock =
    incomingRows.length > 0
      ? `
    <div class="app-panel pw-club-incoming">
      <h3>${t("route.clubs.incomingTitle", "Join requests for your clubs")}</h3>
      <ul class="pw-club-incoming__list">
        ${incomingRows
          .map((r) => {
            const clubName = r._clubName || t("route.clubs.unnamed", "Club");
            const uname = r._uname || String(r.user_id).slice(0, 8);
            return `
            <li class="pw-club-incoming__item">
              <div>
                <strong>${escapeHtml(clubName)}</strong>
                <span class="muted"> · ${escapeHtml(uname)}</span>
              </div>
              <div class="pw-club-incoming__actions">
                <button type="button" class="btn" data-club-approve="${escapeHtml(r.id)}" data-club-approve-club="${escapeHtml(
                  r.club_id,
                )}" data-club-approve-user="${escapeHtml(r.user_id)}">${t("route.clubs.approve", "Approve")}</button>
                <button type="button" class="btn btn-outline" data-club-reject="${escapeHtml(r.id)}">${t(
                  "route.clubs.reject",
                  "Decline",
                )}</button>
              </div>
            </li>`;
          })
          .join("")}
      </ul>
    </div>
  `
      : "";

  return `
    <section class="app-panel">
      <h2>${t("route.clubs.title", "Book clubs")}</h2>
      <p class="muted pw-club-lede">${t(
        "route.clubs.browseLede",
        "Open-directory clubs are listed below: member counts and request-to-join. Invite-only clubs stay off the list (use a code). Club owners can approve join requests in the next section when present.",
      )}</p>
      ${incomingBlock}
      <h3 class="pw-club-browse__title">${t("route.clubs.browseTitle", "Browse clubs")}</h3>
      <div class="app-grid app-grid-2 pw-club-browse-grid">
        ${
          cleanClubs.length
            ? cleanClubs
                .map((c) => {
                  const mcount = c.member_count != null ? Number(c.member_count) : 0;
                  const maxM = c.max_members || 20;
                  const myRole = myRoleByClub[c.id];
                  const isCreator = c.created_by === session.user.id;
                  const atCapacity = mcount >= maxM;
                  const req = myRequestByClub[c.id];
                  const isListed = c.is_private === false;
                  const showCode = isCreator || Boolean(myRole);
                  return `
              <article class="app-panel pw-club-card" data-club-id="${escapeHtml(c.id)}">
                <div class="pw-club-card__head">
                  <h3><span class="pw-club-card__emoji">${escapeHtml(c.cover_emoji || "📚")}</span> ${escapeHtml(c.name || "Club")}</h3>
                  ${isListed ? `<span class="pw-club-badge">${t("route.clubs.listedBadge", "In directory")}</span>` : ""}
                </div>
                <p>${escapeHtml(c.description || "")}</p>
                <p class="metric">${t("route.clubs.members", "Members")}: ${mcount}/${escapeHtml(String(maxM))}</p>
                ${showCode ? `<p class="muted">${t("route.clubs.code", "Code")}: ${escapeHtml(c.invite_code || "—")}</p>` : ""}
                <div class="pw-club-card__ctas">
                  <a class="btn" href="/club?id=${encodeURIComponent(c.id)}" data-link-route="/club">${t("route.clubs.openClub", "Open club")}</a>
                  <div class="pw-club-card__actions">${renderClubCardFooter(c, { myRole, requestStatus: req, atCapacity })}</div>
                </div>
              </article>
            `;
                })
                .join("")
            : !clubs[0]?.__error
              ? `<p class="muted">${t("route.clubs.emptyBrowse", "No clubs to show yet. Create one and list it in the directory, or ask a friend to share a code.")}</p>`
              : ""
        }
        ${clubs[0]?.__error ? `<article class="app-panel"><p>${escapeHtml(clubs[0].text)}</p></article>` : ""}
      </div>
      <p class="muted pw-clubs-footer-hint">${t("route.clubs.browseSetupHint", "To create a club or join with a code, go to Profile and open the Book clubs tab.")}</p>
    </section>
  `;
}

async function renderReader(supabase, session) {
  if (!session?.user) {
    return `<section class="app-panel"><h2>${t("route.reader.title", "Reader tools")}</h2><p>${t("route.authRequired", "Please sign in to view this section.")}</p></section>`;
  }
  const [sessions, history] = await Promise.all([
    runSafeQuery(async () => {
      const { data, error } = await supabase
        .from("reading_sessions")
        .select("duration_seconds, started_at, ended_at, pages_read, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    }, t("appShell.missingSessions", "Could not load reading_sessions.")),
    runSafeQuery(async () => {
      const { data, error } = await supabase
        .from("reading_history")
        .select("book_title, book_author, source, is_finished, last_read_at")
        .eq("user_id", session.user.id)
        .order("last_read_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data || [];
    }, t("appShell.missingHistory", "Could not load reading_history.")),
  ]);

  const totalMinutes = sessions.reduce((sum, x) => {
    if (x.__error) return sum;
    return sum + Math.round(Number(x.duration_seconds || 0) / 60);
  }, 0);
  const historyItems = history.map((h) => {
    if (h.__error) return `<span>${escapeHtml(h.text)}</span>`;
    return `<strong>${escapeHtml(h.book_title || "Book")}</strong><span>${escapeHtml(h.book_author || "")} · ${escapeHtml(h.source || "web")} · ${h.is_finished ? t("route.reader.finished", "Finished") : t("route.reader.inProgress", "In progress")}</span>`;
  });
  const latestSessions = sessions
    .filter((x) => !x.__error)
    .slice(0, 6)
    .map((x) => {
      const seconds = Number(x.duration_seconds || 0);
      const pages = Number(x.pages_read || 0);
      return `<li><strong>${formatDuration(seconds)}</strong><span>${pages > 0 ? `${pages} ${t("route.reader.pages", "pages")} · ` : ""}${escapeHtml(x.ended_at || x.started_at || "")}</span></li>`;
    });

  return `
    <section class="app-panel">
      <h2>${t("route.reader.title", "Reader tools")}</h2>
      <p class="metric">${t("route.reader.minutes", "Total minutes (latest sessions)")}: ${totalMinutes}</p>
      <article class="app-panel">
        <h3>${t("route.reader.timerTitle", "Reading timer")}</h3>
        <p class="metric" id="pw-reader-timer-value">${formatDuration(readerTimer.elapsedSeconds)}</p>
        <div class="cta-actions">
          <button class="btn" id="pw-reader-start-pause">${readerTimer.running ? t("route.reader.pause", "Pause") : t("route.reader.start", "Start reading")}</button>
          <button class="btn btn-outline" id="pw-reader-finish"${readerTimer.elapsedSeconds > 0 ? "" : " disabled"}>${t("route.reader.finish", "Finish session")}</button>
        </div>
        <label>
          <span>${t("route.reader.pagesRead", "Pages read this session")}</span>
          <input id="pw-reader-pages" type="number" min="0" step="1" value="0" />
        </label>
      </article>
      <article class="app-panel">
        <h3>${t("route.reader.historyTitle", "Log reading history")}</h3>
        <form id="pw-reader-history-form" class="form-stack">
          <label><span>${t("route.reader.bookTitle", "Book title")}</span><input id="pw-reader-book-title" type="text" maxlength="200" required /></label>
          <label><span>${t("route.reader.bookAuthor", "Book author")}</span><input id="pw-reader-book-author" type="text" maxlength="200" /></label>
          <label><span>${t("route.reader.source", "Source")}</span><input id="pw-reader-source" type="text" value="web" maxlength="120" /></label>
          <label><span>${t("route.reader.finishedQuestion", "Mark as finished?")}</span><input id="pw-reader-finished" type="checkbox" /></label>
          <button type="submit" class="btn">${t("route.reader.saveHistory", "Save history item")}</button>
        </form>
      </article>
      <article class="app-panel">
        <h3>${t("route.reader.latestSessions", "Latest sessions")}</h3>
        ${listToHtml(latestSessions)}
      </article>
      ${listToHtml(historyItems)}
    </section>
  `;
}

async function renderProfile(supabase, session) {
  const signedIn = !!(session && session.user);
  const authPanel = `
    <section class="webapp-hero">
      <h1>${t("appShell.heroTitle", "Your full Pagewalker experience on web")}</h1>
      <p>${t("appShell.heroLede", "Sign in once and move across library, discover, social, clubs, and reader tools.")}</p>
      <div class="webapp-auth-row">
        <span class="badge-outline">${signedIn ? `${t("appShell.authSignedIn", "Signed in")}: ${escapeHtml(session.user.email || "")}` : t("appShell.authGuest", "Guest mode")}</span>
        <button id="pw-profile-signin" class="btn"${signedIn ? " hidden" : ""}>${t("appShell.signIn", "Sign in")}</button>
        <button id="pw-profile-signup" class="btn btn-outline"${signedIn ? " hidden" : ""}>${t("appShell.signUp", "Sign up")}</button>
        <button id="pw-profile-signout" class="btn btn-outline"${signedIn ? "" : " hidden"}>${t("appShell.signOut", "Sign out")}</button>
      </div>
    </section>
  `;

  if (!session?.user) {
    return `
      ${authPanel}
      <section class="app-panel"><h2>${t("route.profile.title", "Profile")}</h2><p>${t("route.authRequired", "Please sign in to view this section.")}</p></section>
    `;
  }

  const profiles = await runSafeQuery(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, full_name, display_name, bio, avatar_url")
      .eq("id", session.user.id)
      .maybeSingle();
    if (error) throw error;
    return data ? [data] : [];
  }, t("appShell.missingProfile", "Could not load profile."));

  const profile = profiles[0] || {};
  if (!profile?.username) {
    try {
      const emailPrefix = String(session.user.email || "reader")
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      await withTimeout(
        supabase.from("profiles").upsert({
          id: session.user.id,
          username: emailPrefix || "reader",
          display_name: emailPrefix || "reader",
        }),
        12000,
      );
      profile.username = emailPrefix || "reader";
      profile.display_name = emailPrefix || "reader";
    } catch (_) {}
  }
  const [userBooks, diaryRows] = await Promise.all([
    runSafeQuery(async () => {
      const { data, error } = await supabase
        .from("user_books")
        .select("title,author,status,created_at,books(cover_url)")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return data || [];
    }, "Books unavailable."),
    runSafeQuery(async () => {
      const { data, error } = await supabase
        .from("reading_history")
        .select("book_title,book_author,last_read_at,is_finished")
        .eq("user_id", session.user.id)
        .order("last_read_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data || [];
    }, "Diary unavailable."),
  ]);
  const favBooks = userBooks.filter((x) => !x.__error && x.status === "read").slice(0, 4);
  const listCounts = LIBRARY_STATUSES.reduce((acc, status) => {
    acc[status] = userBooks.filter((x) => !x.__error && x.status === status).length;
    return acc;
  }, {});
  const avatarUrl = profile.avatar_url ? String(profile.avatar_url).trim() : "";
  const letterFallback = escapeHtml(
    (profile.display_name || profile.username || session.user.email || "?").trim().charAt(0) || "?",
  ).toUpperCase();
  const profileTab = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("tab") === "clubs" ? "clubs" : "account";
  const showClubsTab = profileTab === "clubs";
  return `
    ${authPanel}
    <div class="pw-profile-tabs" role="tablist" aria-label="${t("route.profile.tablistLabel", "Profile sections")}">
      <button type="button" class="pw-profile-tab" role="tab" id="pw-profile-tab-btn-account" data-profile-tab="account" aria-selected="${!showClubsTab ? "true" : "false"}" aria-controls="pw-profile-panel-account">${t("route.profile.tabAccount", "Account")}</button>
      <button type="button" class="pw-profile-tab" role="tab" id="pw-profile-tab-btn-clubs" data-profile-tab="clubs" aria-selected="${showClubsTab ? "true" : "false"}" aria-controls="pw-profile-panel-clubs">${t("route.profile.tabClubs", "Book clubs")}</button>
    </div>
    <div id="pw-profile-panel-clubs" class="pw-profile-panel" role="tabpanel" aria-labelledby="pw-profile-tab-btn-clubs" ${showClubsTab ? "" : "hidden"}>
      <h2 class="visually-hidden">${t("route.profile.tabClubs", "Book clubs")}</h2>
      <p class="muted">${t("route.profile.clubTabLede", "Start a new club or join with an invite code. Then use Clubs in the menu to open your club and use the book forum.")}</p>
      ${renderClubSetupFormsHtml()}
    </div>
    <div id="pw-profile-panel-account" class="pw-profile-panel" role="tabpanel" aria-labelledby="pw-profile-tab-btn-account" ${showClubsTab ? "hidden" : ""}>
    <section class="app-panel">
        <h2>${t("route.profile.title", "Profile")}</h2>
        <div class="pw-profile-photo-section">
          <div class="pw-profile-photo-wrap">
            ${
              avatarUrl
                ? `<img class="pw-profile-avatar-lg" id="pw-profile-avatar-preview" src="${escapeHtml(avatarUrl)}" alt="${t("userMenu.profilePhotoAlt", "Profile photo")}" width="88" height="88" loading="lazy" />`
                : `<div class="pw-profile-avatar-lg pw-profile-avatar-lg--empty" id="pw-profile-avatar-fallback" aria-hidden="true">${letterFallback}</div>`
            }
          </div>
          <div class="pw-profile-photo-actions">
            <input type="file" id="pw-profile-photo-file" class="visually-hidden" accept="image/jpeg,image/png,image/webp" />
            <button type="button" class="btn btn-outline" id="pw-profile-photo-pick">${t("route.profile.photoChoose", "Upload photo")}</button>
            <button type="button" class="btn btn-outline" id="pw-profile-photo-remove"${!avatarUrl ? " hidden" : ""}>${t("route.profile.photoRemove", "Remove photo")}</button>
          </div>
        </div>
        <p class="muted" id="pw-profile-photo-status" role="status" hidden></p>
        <div class="profile-grid">
          <div><span class="muted">${t("route.profile.email", "Email")}</span><p>${escapeHtml(session.user.email || "-")}</p></div>
          <div><span class="muted">${t("route.profile.username", "Username")}</span><p>${escapeHtml(profile.username || "-")}</p></div>
          <div><span class="muted">${t("route.profile.fullName", "Name")}</span><p>${escapeHtml(profile.full_name || profile.display_name || "-")}</p></div>
        </div>
        <p>${escapeHtml(profile.bio || t("route.profile.bioEmpty", "No bio yet."))}</p>
    </section>
    <section class="app-panel">
      <h3>Top 4 favorites</h3>
      <div class="pw-favorites-grid">
        ${Array.from({ length: 4 }).map((_, i) => {
          const book = favBooks[i];
          const cover = fixCoverUrl(book?.books?.cover_url);
          return `
            <div class="pw-fav-slot">
              ${book ? `${cover ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(book.title)} cover" loading="lazy" />` : "<span>Book</span>"}` : `<span>+</span>`}
            </div>
          `;
        }).join("")}
      </div>
    </section>
    <section class="app-grid app-grid-2">
      <article class="app-panel">
        <h3>Diary</h3>
        ${diaryRows.some((x) => !x.__error) ? `
          <ul class="app-list">
            ${diaryRows.filter((x) => !x.__error).map((row) => `<li><strong>${escapeHtml(row.book_title || "Book")}</strong><span>${escapeHtml(row.book_author || "")} · ${row.is_finished ? "Finished" : "In progress"} · ${escapeHtml(row.last_read_at || "")}</span></li>`).join("")}
          </ul>
        ` : `<p class="muted">Your diary entries will show up here.</p>`}
      </article>
      <article class="app-panel">
        <h3>My Lists</h3>
        <div class="pw-list-collage">
          <div><strong>TBR</strong><span>${listCounts.tbr || 0}</span></div>
          <div><strong>Reading</strong><span>${listCounts.reading || 0}</span></div>
          <div><strong>Read</strong><span>${listCounts.read || 0}</span></div>
          <div><strong>DNF</strong><span>${listCounts.dnf || 0}</span></div>
        </div>
      </article>
    </section>
    </div>
  `;
}

async function renderBookRoute() {
  const params = new URLSearchParams(window.location.search);
  const stableId = String(params.get("id") || "").trim();
  if (stableId) {
    try {
      const fetched = await fetchJson(`/api/books?type=detail&id=${encodeURIComponent(stableId)}`);
      return buildBookPageHtml(fetched);
    } catch (error) {
      const msg = String(error?.message || "");
      const notFound = msg.includes("request_failed_404");
      const unavailable = msg.includes("request_failed_5");
      return `
        <section class="app-panel">
          <h2>Book details</h2>
          <p class="muted">${
            notFound
              ? "This book link no longer exists or was removed by the source provider."
              : unavailable
                ? "Book data is temporarily unavailable. Please try again in a moment."
                : "We could not load this book right now. Try opening it again from Discover."
          }</p>
          <p><a href="/discover" data-link-route="/discover">Go to Discover</a></p>
        </section>
      `;
    }
  }
  const raw = params.get("data");
  const book = decodeBookPayload(raw);
  if (!book) {
    return `
      <section class="app-panel">
        <h2>Book details</h2>
        <p class="muted">This link is missing data. Open a book from Discover or Library first.</p>
        <p><a href="/discover" data-link-route="/discover">Go to Discover</a></p>
      </section>
    `;
  }
  return buildBookPageHtml(book);
}

function renderProtectedRouteGate(route) {
  const routeNameMap = {
    "/discover": t("appNav.discover", "Discover"),
    "/library": t("appNav.library", "Library"),
    "/social": t("appNav.social", "Social"),
    "/clubs": t("appNav.clubs", "Clubs"),
    "/reader": t("appNav.reader", "Reader"),
    "/profile": t("appNav.profile", "Profile"),
  };
  return `
    <section class="app-panel">
      <h2>${t("route.locked.title", "Sign in required")}</h2>
      <p>${t("route.locked.body", "To view in-depth product content on web, please sign in first.")}</p>
      <p class="muted">${t("route.locked.target", "Requested section")}: ${escapeHtml(routeNameMap[route] || route)}</p>
      <div class="cta-actions">
        <button id="pw-locked-signin" class="btn">${t("appShell.signIn", "Sign in")}</button>
        <button id="pw-locked-signup" class="btn btn-outline">${t("appShell.signUp", "Sign up")}</button>
      </div>
    </section>
  `;
}

function renderRouteSkeleton(route) {
  if (route === "/") {
    return `
      <section class="app-panel pw-shimmer-block" style="height: 180px;"></section>
      <section class="pw-poster-grid">
        ${Array.from({ length: 6 }).map(() => `<article class="pw-poster-card"><div class="pw-poster-media pw-shimmer-block"></div><div class="pw-poster-copy"><div class="pw-shimmer-line"></div><div class="pw-shimmer-line short"></div></div></article>`).join("")}
      </section>
    `;
  }
  return `
    <section class="app-panel">
      <div class="pw-shimmer-line"></div>
      <div class="pw-shimmer-line"></div>
      <div class="pw-shimmer-line short"></div>
      <div class="pw-poster-grid">
        ${Array.from({ length: 8 }).map(() => `<article class="pw-poster-card"><div class="pw-poster-media pw-shimmer-block"></div><div class="pw-poster-copy"><div class="pw-shimmer-line"></div><div class="pw-shimmer-line short"></div></div></article>`).join("")}
      </div>
    </section>
  `;
}

function bindLockedGateActions() {
  const signInBtn = document.getElementById("pw-locked-signin");
  const signUpBtn = document.getElementById("pw-locked-signup");
  signInBtn?.addEventListener("click", () => {
    window.location.href = "/sign-in";
  });
  signUpBtn?.addEventListener("click", () => {
    window.location.href = "/sign-up";
  });
}

function bindDiscoverActions(supabase, session, rerender) {
  const form = document.getElementById("pw-discover-search");
  const input = document.getElementById("pw-discover-query");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    discoverQuery = String(input?.value || "").trim();
    discoverPaging.searchPage = 1;
    rerender();
  });
  const genreButtons = document.querySelectorAll("[data-genre-chip]");
  for (let i = 0; i < genreButtons.length; i += 1) {
    genreButtons[i].addEventListener("click", () => {
      discoverGenre = String(genreButtons[i].getAttribute("data-genre-chip") || "romance");
      discoverQuery = "";
      discoverPaging.genrePage = 1;
      rerender();
    });
  }
  const moodSelect = document.getElementById("pw-mood-select");
  const moodInput = document.getElementById("pw-mood-input");
  const syncMoodCustom = () => {
    if (!moodInput || !moodSelect) return;
    if (moodSelect.value === "__custom") moodInput.removeAttribute("hidden");
    else moodInput.setAttribute("hidden", "");
  };
  moodSelect?.addEventListener("change", syncMoodCustom);
  syncMoodCustom();
  const moodForm = document.getElementById("pw-mood-form");
  moodForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const sel = document.getElementById("pw-mood-select");
    const mInput = document.getElementById("pw-mood-input");
    let mood = "";
    if (sel?.value === "__custom") mood = String(mInput?.value || "").trim();
    else mood = String(sel?.value || "").trim();
    discoverMood = mood;
    if (!mood) return;
    const resultsRoot = document.getElementById("pw-mood-results");
    if (resultsRoot) {
      resultsRoot.innerHTML = `<p class="muted">${t("route.discover.loadingMood", "Finding recommendations...")}</p>`;
    }
    try {
      const response = await fetch("/api/mood-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood }),
      });
      const data = await response.json();
      const rows = Array.isArray(data.recommendations) ? data.recommendations : [];
      if (resultsRoot) {
        resultsRoot.innerHTML = rows.length
          ? `<div class="app-grid app-grid-3">${rows.map((r) => `<article class="app-panel"><h4>${escapeHtml(r.title || "Book")}</h4><p>${escapeHtml(r.author || "")}</p><p>${escapeHtml(r.reason || "")}</p></article>`).join("")}</div>`
          : `<p class="muted">${t("route.discover.noMoodResults", "No recommendations yet. Try another mood.")}</p>`;
      }
    } catch (_) {
      if (resultsRoot) {
        resultsRoot.innerHTML = `<p class="muted">${t("route.discover.noMoodResults", "No recommendations yet. Try another mood.")}</p>`;
      }
    }
  });
  const addButtons = document.querySelectorAll("[data-discover-add]");
  for (let i = 0; i < addButtons.length; i += 1) {
    addButtons[i].addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!guardAuthAction(addButtons[i], session)) return;
      try {
        const raw = addButtons[i].getAttribute("data-book");
        const status = addButtons[i].getAttribute("data-status") || "tbr";
        if (!raw) return;
        const parsed = JSON.parse(raw);
        await upsertUserBookStatus(supabase, session.user.id, parsed, status);
        showBanner("success", t("route.discover.saved", "Saved to your library."));
      } catch (error) {
        showBanner("error", error?.message || t("appShell.missingData", "Something went wrong."));
      }
    });
  }
  const loadMoreButtons = document.querySelectorAll("[data-discover-more]");
  for (let i = 0; i < loadMoreButtons.length; i += 1) {
    loadMoreButtons[i].addEventListener("click", () => {
      const mode = String(loadMoreButtons[i].getAttribute("data-discover-more") || "");
      if (mode === "trending") discoverPaging.trendingPage += 1;
      if (mode === "genre") discoverPaging.genrePage += 1;
      if (mode === "search") discoverPaging.searchPage += 1;
      if (mode === "classics") discoverPaging.classicsPage += 1;
      rerender();
    });
  }
}

function bindLibraryActions(supabase, session, rerender) {
  const filterButtons = document.querySelectorAll("[data-library-filter]");
  for (let i = 0; i < filterButtons.length; i += 1) {
    filterButtons[i].addEventListener("click", () => {
      libraryFilter = filterButtons[i].getAttribute("data-library-filter") || "all";
      rerender();
    });
  }
  const statusButtons = document.querySelectorAll("[data-library-status]");
  for (let i = 0; i < statusButtons.length; i += 1) {
    statusButtons[i].addEventListener("click", async () => {
      try {
        const title = statusButtons[i].getAttribute("data-library-title") || "";
        const status = statusButtons[i].getAttribute("data-library-status") || "tbr";
        const { error } = await supabase
          .from("user_books")
          .update({ status })
          .eq("user_id", session.user.id)
          .eq("title", title);
        if (error) throw error;
        showBanner("success", t("route.library.updated", "Library status updated."));
        rerender();
      } catch (error) {
        showBanner("error", error?.message || t("appShell.missingData", "Something went wrong."));
      }
    });
  }
  const loadMoreBtn = document.querySelector("[data-library-more]");
  loadMoreBtn?.addEventListener("click", () => {
    libraryPage += 1;
    rerender();
  });
}

function bindBookPageActions(supabase, session, rerender) {
  const copyBtn = document.getElementById("pw-book-page-copy");
  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showBanner("success", "Book link copied.");
    } catch (_) {
      showBanner("error", "Could not copy link.");
    }
  });
  const addBtn = document.querySelector("[data-book-page-add]");
  addBtn?.addEventListener("click", async (event) => {
    event.preventDefault();
    if (!guardAuthAction(addBtn, session)) return;
    try {
      const raw = addBtn.getAttribute("data-book");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      await upsertUserBookStatus(supabase, session.user.id, parsed, "tbr");
      showBanner("success", t("route.discover.saved", "Saved to your library."));
    } catch (error) {
      showBanner("error", error?.message || t("appShell.missingData", "Something went wrong."));
    }
  });
  const reviewBtn = document.querySelector("[data-book-page-review]");
  reviewBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    if (!guardAuthAction(reviewBtn, session)) return;
    const raw = reviewBtn.getAttribute("data-book");
    if (!raw) return;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    const bookTitle = parsed.title || "Untitled";
    socialDraft = { title: bookTitle, body: "", rating: "5" };
    socialComposerExpanded = true;
    if (window.location.pathname !== "/social") {
      window.history.pushState({}, "", "/social");
    }
    rerender();
  });
}

function bindBookModalActions() {
  const hitAreas = document.querySelectorAll("[data-book-modal]");
  for (let i = 0; i < hitAreas.length; i += 1) {
    hitAreas[i].addEventListener("click", () => {
      const raw = hitAreas[i].getAttribute("data-book-modal");
      if (!raw) return;
      try {
        openBookModal(JSON.parse(raw));
      } catch (_) {}
    });
  }

  const modal = ensureBookModal();
  const closers = modal.querySelectorAll("[data-modal-close]");
  for (let i = 0; i < closers.length; i += 1) {
    if (closers[i].dataset.bound === "true") continue;
    closers[i].addEventListener("click", closeBookModal);
    closers[i].dataset.bound = "true";
  }
  if (!document.body.dataset.modalEscBound) {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeBookModal();
    });
    document.body.dataset.modalEscBound = "true";
  }
}

function bindSocialActions(supabase, session, rerender) {
  const form = document.getElementById("pw-social-form");
  const titleInput = document.getElementById("pw-social-title");
  const bodyInput = document.getElementById("pw-social-body");
  const ratingInput = document.getElementById("pw-social-rating");
  const editIdInput = document.getElementById("pw-social-edit-id");
  const compToggle = document.getElementById("pw-social-composer-toggle");
  const compPanel = document.getElementById("pw-social-composer-panel");

  function setComposerOpen(open) {
    if (!compPanel || !compToggle) return;
    compPanel.hidden = !open;
    compToggle.setAttribute("aria-expanded", open ? "true" : "false");
    socialComposerExpanded = open;
  }

  compToggle?.addEventListener("click", () => {
    if (!compPanel) return;
    setComposerOpen(!!compPanel.hidden);
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = String(titleInput?.value || "").trim();
    const body = String(bodyInput?.value || "").trim();
    const rating = Number(ratingInput?.value || 5);
    const editId = String(editIdInput?.value || "");
    socialDraft = { title, body, rating: String(rating || 5) };
    if (!title || !body) {
      setComposerOpen(true);
      showBanner("error", t("route.social.validation", "Title and review text are required."));
      return;
    }
    try {
      if (editId) {
        const { error } = await supabase
          .from("reviews")
          .update({
            title,
            review_text: body,
            rating,
            content: body,
            star_rating: rating,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editId)
          .eq("user_id", session.user.id);
        if (error) throw error;
        showBanner("success", t("route.social.updated", "Review updated."));
      } else {
        const payload = {
          user_id: session.user.id,
          title,
          review_text: body,
          rating,
          content: body,
          star_rating: rating,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        let { error } = await supabase.from("reviews").insert(payload);
        if (error && String(error.message || "").toLowerCase().includes("book_id")) {
          const retry = await supabase
            .from("reviews")
            .insert({ ...payload, book_id: "web-review" });
          error = retry.error;
        }
        if (error) throw error;
        showBanner("success", t("route.social.published", "Review published."));
      }
      socialDraft = { title: "", body: "", rating: "5" };
      socialComposerExpanded = false;
      setComposerOpen(false);
      rerender();
    } catch (error) {
      showBanner("error", error?.message || t("appShell.missingData", "Something went wrong."));
    }
  });

  const editButtons = document.querySelectorAll("[data-social-edit]");
  for (let i = 0; i < editButtons.length; i += 1) {
    editButtons[i].addEventListener("click", () => {
      const id = editButtons[i].getAttribute("data-social-edit") || "";
      const title = editButtons[i].getAttribute("data-social-title") || "";
      const body = editButtons[i].getAttribute("data-social-body") || "";
      const rating = editButtons[i].getAttribute("data-social-rating") || "5";
      if (titleInput) titleInput.value = title;
      if (bodyInput) bodyInput.value = body;
      if (ratingInput) ratingInput.value = rating;
      if (editIdInput) editIdInput.value = id;
      socialDraft = { title, body, rating };
      setComposerOpen(true);
      compPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
      showBanner("success", t("route.social.editing", "Editing review. Save to apply changes."));
    });
  }

  const deleteButtons = document.querySelectorAll("[data-social-delete]");
  for (let i = 0; i < deleteButtons.length; i += 1) {
    deleteButtons[i].addEventListener("click", async () => {
      const id = deleteButtons[i].getAttribute("data-social-delete");
      if (!id) return;
      try {
        const { error } = await supabase
          .from("reviews")
          .delete()
          .eq("id", id)
          .eq("user_id", session.user.id);
        if (error) throw error;
        showBanner("success", t("route.social.deleted", "Review deleted."));
        rerender();
      } catch (error) {
        showBanner("error", error?.message || t("appShell.missingData", "Something went wrong."));
      }
    });
  }

  const toggleButtons = document.querySelectorAll("[data-review-toggle]");
  for (let i = 0; i < toggleButtons.length; i += 1) {
    toggleButtons[i].addEventListener("click", () => {
      const card = toggleButtons[i].closest(".pw-review-card");
      if (!card) return;
      const full = card.querySelector("[data-review-full]");
      const short = card.querySelector("[data-review-short]");
      if (!full || !short) return;
      const expanded = !full.hidden;
      full.hidden = expanded;
      short.hidden = !expanded;
      toggleButtons[i].textContent = expanded ? "Read more" : "Show less";
    });
  }
}

function bindReaderActions(supabase, session, rerender) {
  const timerEl = document.getElementById("pw-reader-timer-value");
  const startPauseBtn = document.getElementById("pw-reader-start-pause");
  const finishBtn = document.getElementById("pw-reader-finish");
  const pagesInput = document.getElementById("pw-reader-pages");
  const historyForm = document.getElementById("pw-reader-history-form");

  const updateTimerUi = () => {
    if (timerEl) timerEl.textContent = formatDuration(readerTimer.elapsedSeconds);
    if (startPauseBtn) {
      startPauseBtn.textContent = readerTimer.running
        ? t("route.reader.pause", "Pause")
        : t("route.reader.start", "Start reading");
    }
    if (finishBtn) finishBtn.disabled = readerTimer.elapsedSeconds <= 0;
  };

  const ensureTicker = () => {
    if (readerTicker) clearInterval(readerTicker);
    readerTicker = setInterval(() => {
      if (!readerTimer.running) return;
      readerTimer.elapsedSeconds += 1;
      updateTimerUi();
    }, 1000);
  };

  startPauseBtn?.addEventListener("click", () => {
    if (!readerTimer.running) {
      readerTimer.running = true;
      if (!readerTimer.startedAtMs) {
        readerTimer.startedAtMs = Date.now() - readerTimer.elapsedSeconds * 1000;
      }
      ensureTicker();
    } else {
      readerTimer.running = false;
    }
    updateTimerUi();
  });

  finishBtn?.addEventListener("click", async () => {
    if (readerTimer.elapsedSeconds <= 0) return;
    try {
      const endedAt = new Date();
      const startedAt = new Date(readerTimer.startedAtMs || Date.now() - readerTimer.elapsedSeconds * 1000);
      const pagesRead = Math.max(0, Number(pagesInput?.value || 0));
      const payload = {
        user_id: session.user.id,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_seconds: Math.round(readerTimer.elapsedSeconds),
        pages_read: pagesRead,
      };
      const { error } = await supabase.from("reading_sessions").insert(payload);
      if (error) throw error;
      readerTimer = { running: false, startedAtMs: null, elapsedSeconds: 0 };
      if (pagesInput) pagesInput.value = "0";
      updateTimerUi();
      showBanner("success", t("route.reader.savedSession", "Reading session saved."));
      rerender();
    } catch (error) {
      showBanner("error", error?.message || t("appShell.missingData", "Something went wrong."));
    }
  });

  historyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const titleEl = document.getElementById("pw-reader-book-title");
    const authorEl = document.getElementById("pw-reader-book-author");
    const sourceEl = document.getElementById("pw-reader-source");
    const finishedEl = document.getElementById("pw-reader-finished");
    const bookTitle = String(titleEl?.value || "").trim();
    if (!bookTitle) {
      showBanner("error", t("route.reader.historyValidation", "Book title is required."));
      return;
    }
    try {
      const { error } = await supabase.from("reading_history").insert({
        user_id: session.user.id,
        book_id: `web-${Date.now()}`,
        book_title: bookTitle,
        book_author: String(authorEl?.value || "").trim(),
        source: String(sourceEl?.value || "web").trim() || "web",
        scroll_position: 100,
        is_finished: !!finishedEl?.checked,
        last_read_at: new Date().toISOString(),
      });
      if (error) throw error;
      historyForm.reset();
      const sourceReset = document.getElementById("pw-reader-source");
      if (sourceReset) sourceReset.value = "web";
      showBanner("success", t("route.reader.savedHistory", "Reading history saved."));
      rerender();
    } catch (error) {
      showBanner("error", error?.message || t("appShell.missingData", "Something went wrong."));
    }
  });

  updateTimerUi();
  if (readerTimer.running) ensureTicker();
}

function bindClubsActions(supabase, session, rerender) {
  const createForm = document.getElementById("pw-club-create-form");
  const joinForm = document.getElementById("pw-club-join-form");

  createForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nameEl = document.getElementById("pw-club-name");
    const descEl = document.getElementById("pw-club-description");
    const emojiEl = document.getElementById("pw-club-emoji");
    const maxMembersEl = document.getElementById("pw-club-max-members");
    const name = String(nameEl?.value || "").trim();
    const description = String(descEl?.value || "").trim();
    const emoji = String(emojiEl?.value || "📚").trim() || "📚";
    const maxMembers = Number(maxMembersEl?.value || 20);
    clubsDraft = { ...clubsDraft, name, description, emoji, maxMembers: String(maxMembers) };
    if (!name) {
      showBanner("error", t("route.clubs.validationName", "Club name is required."));
      return;
    }
    const dirEl = document.getElementById("pw-club-directory");
    const listInDirectory = dirEl ? Boolean(dirEl.checked) : true;
    try {
      const { data: freshAuth, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const uid = freshAuth?.session?.user?.id;
      if (!uid) {
        showBanner("error", t("route.clubs.signInToCreate", "Sign in to create a club."));
        return;
      }
      const { data: created, error } = await supabase
        .from("book_clubs")
        .insert({
          name,
          description: description || null,
          cover_emoji: emoji,
          created_by: uid,
          max_members: maxMembers,
          is_private: !listInDirectory,
        })
        .select("id, invite_code")
        .single();
      if (error) throw error;
      const { error: memberErr } = await supabase
        .from("book_club_members")
        .insert({
          club_id: created.id,
          user_id: uid,
          role: "admin",
        });
      if (memberErr) throw memberErr;
      clubsDraft = { ...clubsDraft, name: "", description: "" };
      showBanner("success", `${t("route.clubs.created", "Club created.")} ${t("route.clubs.code", "Code")}: ${created.invite_code || "-"}`);
      rerender();
    } catch (error) {
      showBanner("error", error?.message || t("appShell.missingData", "Something went wrong."));
    }
  });

  const doJoinWithCode = async (rawCode) => {
    const code = String(rawCode || "").trim();
    clubsDraft = { ...clubsDraft, inviteCode: code };
    if (!code) {
      showBanner("error", t("route.clubs.validationCode", "Invite code is required."));
      return;
    }
    try {
      const { data: club, error } = await supabase
        .from("book_clubs")
        .select("id")
        .ilike("invite_code", code)
        .maybeSingle();
      if (error) throw error;
      if (!club?.id) {
        showBanner("error", t("route.clubs.invalidCode", "Invite code not found."));
        return;
      }
      const { data: jAuth, error: jSessErr } = await supabase.auth.getSession();
      if (jSessErr) throw jSessErr;
      const joinUid = jAuth?.session?.user?.id;
      if (!joinUid) {
        showBanner("error", t("route.clubs.signInToCreate", "Sign in to create a club."));
        return;
      }
      const { error: joinErr } = await supabase
        .from("book_club_members")
        .upsert({ club_id: club.id, user_id: joinUid, role: "member" }, { onConflict: "club_id,user_id" });
      if (joinErr) throw joinErr;
      clubsDraft = { ...clubsDraft, inviteCode: "" };
      showBanner("success", t("route.clubs.joined", "Joined club successfully."));
      rerender();
    } catch (error) {
      showBanner("error", error?.message || t("appShell.missingData", "Something went wrong."));
    }
  };

  joinForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const codeEl = document.getElementById("pw-club-invite-code");
    await doJoinWithCode(codeEl?.value || "");
  });

  const requestButtons = document.querySelectorAll("[data-club-request]");
  for (let i = 0; i < requestButtons.length; i += 1) {
    requestButtons[i].addEventListener("click", async () => {
      const clubId = requestButtons[i].getAttribute("data-club-request") || "";
      if (!clubId) return;
      try {
        const { error } = await supabase.from("book_club_join_requests").insert({
          club_id: clubId,
          user_id: session.user.id,
          status: "pending",
        });
        if (error) throw error;
        showBanner("success", t("route.clubs.requestSent", "Request sent. The organiser can approve you."));
        rerender();
      } catch (error) {
        showBanner("error", error?.message || t("appShell.missingData", "Something went wrong."));
      }
    });
  }

  const rejoinButtons = document.querySelectorAll("[data-club-rejoin]");
  for (let i = 0; i < rejoinButtons.length; i += 1) {
    rejoinButtons[i].addEventListener("click", async () => {
      const clubId = rejoinButtons[i].getAttribute("data-club-rejoin") || "";
      if (!clubId) return;
      try {
        const { error } = await supabase
          .from("book_club_join_requests")
          .update({ status: "pending", resolved_at: null })
          .eq("club_id", clubId)
          .eq("user_id", session.user.id)
          .eq("status", "rejected");
        if (error) throw error;
        showBanner("success", t("route.clubs.requestSent", "Request sent. The organiser can approve you."));
        rerender();
      } catch (error) {
        showBanner("error", error?.message || t("appShell.missingData", "Something went wrong."));
      }
    });
  }

  const approveButtons = document.querySelectorAll("[data-club-approve]");
  for (let i = 0; i < approveButtons.length; i += 1) {
    approveButtons[i].addEventListener("click", async () => {
      const requestId = approveButtons[i].getAttribute("data-club-approve") || "";
      const clubId = approveButtons[i].getAttribute("data-club-approve-club") || "";
      const userId = approveButtons[i].getAttribute("data-club-approve-user") || "";
      if (!requestId || !clubId || !userId) return;
      try {
        const { error: mErr } = await supabase
          .from("book_club_members")
          .insert({ club_id: clubId, user_id: userId, role: "member" });
        if (mErr) throw mErr;
        const { error: uErr } = await supabase
          .from("book_club_join_requests")
          .update({ status: "approved", resolved_at: new Date().toISOString() })
          .eq("id", requestId);
        if (uErr) throw uErr;
        showBanner("success", t("route.clubs.approved", "Member added."));
        rerender();
      } catch (error) {
        showBanner("error", error?.message || t("appShell.missingData", "Something went wrong."));
      }
    });
  }

  const rejectButtons = document.querySelectorAll("[data-club-reject]");
  for (let i = 0; i < rejectButtons.length; i += 1) {
    rejectButtons[i].addEventListener("click", async () => {
      const requestId = rejectButtons[i].getAttribute("data-club-reject") || "";
      if (!requestId) return;
      try {
        const { error } = await supabase
          .from("book_club_join_requests")
          .update({ status: "rejected", resolved_at: new Date().toISOString() })
          .eq("id", requestId);
        if (error) throw error;
        showBanner("success", t("route.clubs.rejected", "Request declined."));
        rerender();
      } catch (error) {
        showBanner("error", error?.message || t("appShell.missingData", "Something went wrong."));
      }
    });
  }
}

async function renderCurrentRoute(supabase, session, route) {
  if (route === "/") return renderHome(supabase, session);
  if (route === "/book") return renderBookRoute();
  if (route === "/discover") return renderDiscover(supabase, session);
  if (route === "/library") return renderLibrary(supabase, session);
  if (route === "/social") return renderSocial(supabase, session);
  if (route === "/clubs") return renderClubs(supabase, session);
  if (route === "/club") return renderClubDetail(supabase, session);
  if (route === "/reader") return renderReader(supabase, session);
  if (route === "/profile") return renderProfile(supabase, session);
  return "";
}

async function renderRoute(supabase, session) {
  const route = APP_ROUTES.has(window.location.pathname) ? window.location.pathname : "/";
  const pathForNav = window.location.pathname === "/club" ? "/clubs" : route;
  setActiveRoute(pathForNav);
  const root = document.getElementById("pw-route-content");
  if (!root) return;

  hideBanners();
  if (!session?.user && PROTECTED_ROUTES.has(route)) {
    root.innerHTML = renderProtectedRouteGate(route);
    bindLockedGateActions();
    return;
  }
  root.classList.remove("pw-route-enter");
  root.innerHTML = renderRouteSkeleton(route);
  root.innerHTML = await renderCurrentRoute(supabase, session, route);
  requestAnimationFrame(() => {
    root.classList.add("pw-route-enter");
    if (route === "/club") {
      const sc = document.getElementById("pw-club-chat-scroll");
      if (sc) sc.scrollTop = sc.scrollHeight;
    }
  });
  const rerender = () => renderRoute(supabase, session);
  if (route === "/discover") bindDiscoverActions(supabase, session, rerender);
  if (route === "/library") bindLibraryActions(supabase, session, rerender);
  if (route === "/social") bindSocialActions(supabase, session, rerender);
  if (route === "/reader") bindReaderActions(supabase, session, rerender);
  if (route === "/clubs") bindClubsActions(supabase, session, rerender);
  if (route === "/club") bindClubDetailActions(supabase, session, rerender);
  if (route === "/profile" && session?.user) {
    bindClubsActions(supabase, session, rerender);
    bindProfileTabActions();
  }
  if (route === "/profile") {
    const signInBtn = document.getElementById("pw-profile-signin");
    const signUpBtn = document.getElementById("pw-profile-signup");
    const signOutBtn = document.getElementById("pw-profile-signout");
    signInBtn?.addEventListener("click", () => {
      window.location.href = "/sign-in";
    });
    signUpBtn?.addEventListener("click", () => {
      window.location.href = "/sign-up";
    });
    signOutBtn?.addEventListener("click", async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        showBanner("error", error.message);
        return;
      }
      showBanner("success", t("appShell.signedOut", "You are signed out."));
    });
    if (session?.user) {
      bindProfilePhotoActions(supabase, async () => {
        if (typeof window.pwUserMenuRefresh === "function") {
          await window.pwUserMenuRefresh();
        }
        if (typeof window.pwRerender === "function") {
          await window.pwRerender();
        }
      });
    }
  }
  if (route === "/book") {
    bindBookPageActions(supabase, session, rerender);
  }
  bindBookModalActions();
}

function initLinks(render) {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("[data-link-route]");
    if (!link) return;
    event.preventDefault();
    const route = link.getAttribute("data-link-route") || "/";
    const href = link.getAttribute("href") || route;
    let targetUrl = href;
    try {
      targetUrl = new URL(href, window.location.origin).pathname + new URL(href, window.location.origin).search;
    } catch (_) {}
    const targetPath = targetUrl.split("?")[0] || "/";
    if (!APP_ROUTES.has(targetPath)) return;
    if (`${window.location.pathname}${window.location.search}` !== targetUrl) {
      window.history.pushState({}, "", targetUrl);
    }
    render();
  });
  window.addEventListener("popstate", render);
}

async function boot() {
  ensureAppPath();
  let supabase;
  try {
    supabase = await getSupabase();
  } catch (error) {
    showBanner("error", t("app.configError"));
    return;
  }

  let session;
  try {
    const { data, error } = await withTimeout(supabase.auth.getSession(), 15000);
    if (error) {
      showBanner("error", error.message);
    }
    session = data?.session ?? null;
  } catch (_) {
    showBanner(
      "error",
      t(
        "app.sessionTimeout",
        "Session is taking too long. Check your connection and try refreshing the page.",
      ),
    );
    session = null;
  }

  const userMenu = initUserMenu(supabase);
  const appDrawer = initAppDrawer();
  window.pwSyncNav = function pwSyncNav() {
    const route = APP_ROUTES.has(window.location.pathname) ? window.location.pathname : "/";
    const pathForNav = window.location.pathname === "/club" ? "/clubs" : route;
    setActiveRoute(pathForNav);
  };

  const render = async () => {
    userMenu.close();
    closeAuthNudge();
    appDrawer.close();
    await renderRoute(supabase, session);
  };
  window.pwRerender = render;
  window.pwUserMenuRefresh = () => userMenu.refresh(session);

  initLinks(render);
  await userMenu.refresh(session);
  await render();

  supabase.auth.onAuthStateChange(async (_evt, newSession) => {
    session = newSession;
    await userMenu.refresh(session);
    await render();
  });
}

boot();
