import { getSupabase } from "./pw-supabase.js";

const APP_ROUTES = new Set([
  "/",
  "/book",
  "/discover",
  "/library",
  "/social",
  "/clubs",
  "/reader",
  "/profile",
]);
const PROTECTED_ROUTES = new Set([
  "/discover",
  "/library",
  "/social",
  "/clubs",
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
let libraryFilter = "all";
let discoverPaging = {
  trendingPage: 1,
  genrePage: 1,
  searchPage: 1,
  classicsPage: 1,
};
let libraryPage = 1;
let socialDraft = { title: "", body: "", rating: "5" };
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

function renderBackToProfile() {
  return `
    <p>
      <a class="btn btn-outline" href="/profile" data-link-route="/profile">${t("common.backProfile", "← Back to Profile")}</a>
    </p>
  `;
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
      <div class="pw-canonical">
        <span class="muted">Canonical URL</span>
        <code>${escapeHtml(shareUrl)}</code>
      </div>
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

async function renderHome(_supabase, _session) {
  const [trendingBooks, latestReviews] = await Promise.all([
    runSafeQuery(async () => {
      const json = await fetchJson("/api/books?type=trending");
      return extractBooksFromApiResponse(json).slice(0, 6);
    }, "Trending unavailable."),
    runSafeQuery(async () => {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from("reviews")
        .select("title, review_text, rating, book_title, profiles(display_name,username)")
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data || [];
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
    <section class="app-panel">
      <h3>${t("route.home.profilePromptTitle", "Account actions are in Profile")}</h3>
      <p>${t("route.home.profilePromptBody", "Use the Profile tab for Guest mode, Sign in, Sign up, and Sign out.")}</p>
      <p><a href="/profile" data-link-route="/profile">${t("appNav.profile", "Profile")}</a></p>
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

  return `
    <section class="app-panel">
      ${renderBackToProfile()}
      <h2>${t("route.discover.title", "Discover & search")}</h2>
      <p>${t("route.discover.body", "Browse catalog books and use app search from web.")}</p>
      <form id="pw-discover-search" class="form-stack pw-sticky-bar">
        <label>
          <span>${t("route.discover.searchLabel", "Search books")}</span>
          <input id="pw-discover-query" type="text" value="${escapeHtml(safeQuery)}" placeholder="${t("route.discover.searchPlaceholder", "Search by title")}" />
        </label>
        <button type="submit" class="btn">${t("route.discover.searchAction", "Search")}</button>
      </form>
      <article class="app-panel pw-sticky-bar">
        <h3>${t("route.discover.moodTitle", "What's your vibe?")}</h3>
        <div class="cta-actions">
          ${["Make me cry", "Dark & twisted", "Cozy", "Slow burn", "Magic", "Mystery"].map((m) => `<button class="btn btn-outline" data-mood-chip="${escapeHtml(m)}">${escapeHtml(m)}</button>`).join("")}
        </div>
        <form id="pw-mood-form" class="form-stack">
          <label>
            <span>${t("route.discover.moodInputLabel", "Mood")}</span>
            <input id="pw-mood-input" type="text" value="${escapeHtml(discoverMood)}" placeholder="${t("route.discover.moodPlaceholder", "Tell us what you want to feel")}"/>
          </label>
          <button type="submit" class="btn">${t("route.discover.moodAction", "Find my next read")}</button>
        </form>
        <div id="pw-mood-results"></div>
      </article>
      <article class="app-panel">
        <h3>🔥 ${t("route.discover.trendingTitle", "Trending now")}</h3>
        <div class="pw-poster-grid">
          ${trendingRows.map((book) => renderBookPosterCard(book, {
            actionHtml: `<div class="cta-actions"><button class="btn btn-outline" data-discover-add data-status="tbr" data-book='${escapeHtml(JSON.stringify(book))}'>${t("route.discover.addTbr", "Add to TBR")}</button></div>`,
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
                <button class="btn btn-outline" data-discover-add data-status="tbr" data-book='${escapeHtml(JSON.stringify(book))}'>${t("route.discover.addTbr", "Add to TBR")}</button>
                <button class="btn btn-outline" data-discover-add data-status="reading" data-book='${escapeHtml(JSON.stringify(book))}'>${t("route.discover.addReading", "Mark Reading")}</button>
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
      <p class="muted">${t("route.discover.noteAuthed", "You are signed in. Use discover + library together.")}</p>
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
      ${renderBackToProfile()}
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
  const reviews = await runSafeQuery(async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, user_id, title, review_text, rating, content, star_rating, created_at, book_title, book_author, profiles(username, display_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw error;
    return data || [];
  }, t("appShell.missingReviews", "Could not load reviews."));
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
      ${renderBackToProfile()}
      <h2>${t("route.social.title", "Reviews & social")}</h2>
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
            ${[1, 2, 3, 4, 5].map((x) => `<option value="${x}"${String(x) === String(socialDraft.rating) ? " selected" : ""}>${x}</option>`).join("")}
          </select>
        </label>
        <div class="cta-actions">
          <button type="submit" class="btn">${t("route.social.publish", "Publish review")}</button>
          <input id="pw-social-edit-id" type="hidden" value="" />
        </div>
      </form>
      <div class="app-grid app-grid-3">
        ${cards.join("")}
      </div>
      <p class="muted">${t("route.social.authed", "Use the mobile app and web together with the same account.")}</p>
    </section>
  `;
}

async function renderClubs(supabase, session) {
  if (!session?.user) {
    return `<section class="app-panel"><h2>${t("route.clubs.title", "Book clubs")}</h2><p>${t("route.authRequired", "Please sign in to view this section.")}</p></section>`;
  }

  const clubs = await runSafeQuery(async () => {
    const { data, error } = await supabase
      .from("book_clubs")
      .select("id, name, description, invite_code, cover_emoji, max_members, created_by")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data || [];
  }, t("appShell.missingClubs", "Could not load book_clubs."));

  const clubIds = clubs.filter((c) => !c.__error).map((c) => c.id);
  let memberRows = [];
  if (clubIds.length) {
    memberRows = await runSafeQuery(async () => {
      const { data, error } = await supabase
        .from("book_club_members")
        .select("club_id, user_id, role")
        .in("club_id", clubIds);
      if (error) throw error;
      return data || [];
    }, t("appShell.missingClubs", "Could not load members."));
  }

  const memberCountMap = {};
  const myClubMap = {};
  for (let i = 0; i < memberRows.length; i += 1) {
    const row = memberRows[i];
    if (row.__error) continue;
    memberCountMap[row.club_id] = (memberCountMap[row.club_id] || 0) + 1;
    if (row.user_id === session.user.id) myClubMap[row.club_id] = row.role || "member";
  }

  return `
    <section class="app-panel">
      ${renderBackToProfile()}
      <h2>${t("route.clubs.title", "Book clubs")}</h2>
      <div class="app-grid app-grid-2">
        <article class="app-panel">
          <h3>${t("route.clubs.createTitle", "Create a club")}</h3>
          <form id="pw-club-create-form" class="form-stack">
            <label><span>${t("route.clubs.clubName", "Club name")}</span><input id="pw-club-name" type="text" maxlength="120" value="${escapeHtml(clubsDraft.name)}" required /></label>
            <label><span>${t("route.clubs.clubDescription", "Description")}</span><textarea id="pw-club-description" rows="3" maxlength="500">${escapeHtml(clubsDraft.description)}</textarea></label>
            <label><span>${t("route.clubs.clubEmoji", "Emoji")}</span><input id="pw-club-emoji" type="text" maxlength="2" value="${escapeHtml(clubsDraft.emoji)}" /></label>
            <label><span>${t("route.clubs.maxMembers", "Max members")}</span><select id="pw-club-max-members" class="pw-select"><option value="5"${clubsDraft.maxMembers === "5" ? " selected" : ""}>5</option><option value="10"${clubsDraft.maxMembers === "10" ? " selected" : ""}>10</option><option value="20"${clubsDraft.maxMembers === "20" ? " selected" : ""}>20</option></select></label>
            <button type="submit" class="btn">${t("route.clubs.createAction", "Create club")}</button>
          </form>
        </article>
        <article class="app-panel">
          <h3>${t("route.clubs.joinTitle", "Join with invite code")}</h3>
          <form id="pw-club-join-form" class="form-stack">
            <label><span>${t("route.clubs.inviteCode", "Invite code")}</span><input id="pw-club-invite-code" type="text" maxlength="30" value="${escapeHtml(clubsDraft.inviteCode)}" placeholder="A1B2C3D4" required /></label>
            <button type="submit" class="btn btn-outline">${t("route.clubs.joinAction", "Join club")}</button>
          </form>
        </article>
      </div>
      <div class="app-grid app-grid-3">
        ${
          clubs.map((c) => {
            if (c.__error) return `<article class="app-panel"><p>${escapeHtml(c.text)}</p></article>`;
            const count = memberCountMap[c.id] || 0;
            const role = myClubMap[c.id];
            const roleText = role ? `${t("route.clubs.yourRole", "Your role")}: ${escapeHtml(role)}` : t("route.clubs.notMember", "Not a member");
            return `
              <article class="app-panel">
                <h3>${escapeHtml(c.cover_emoji || "📚")} ${escapeHtml(c.name || "Club")}</h3>
                <p>${escapeHtml(c.description || "")}</p>
                <p class="metric">${t("route.clubs.members", "Members")}: ${count}/${escapeHtml(c.max_members || 20)}</p>
                <p class="muted">${roleText}</p>
                <p class="muted">${t("route.clubs.code", "Code")}: ${escapeHtml(c.invite_code || "-")}</p>
                ${role ? "" : `<button class="btn btn-outline" data-club-quick-join="${escapeHtml(c.invite_code || "")}">${t("route.clubs.joinAction", "Join club")}</button>`}
              </article>
            `;
          }).join("")
        }
      </div>
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
        .select("minutes_read, duration_seconds, started_at, ended_at, pages_read")
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
    if (x.minutes_read != null) return sum + Number(x.minutes_read || 0);
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
      const seconds = Number(x.duration_seconds || Number(x.minutes_read || 0) * 60);
      const pages = Number(x.pages_read || 0);
      return `<li><strong>${formatDuration(seconds)}</strong><span>${pages > 0 ? `${pages} ${t("route.reader.pages", "pages")} · ` : ""}${escapeHtml(x.ended_at || x.started_at || "")}</span></li>`;
    });

  return `
    <section class="app-panel">
      ${renderBackToProfile()}
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
      .select("username, full_name, display_name, bio")
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
  return `
    ${authPanel}
    <section class="app-grid app-grid-2">
      <article class="app-panel">
        <h2>${t("route.profile.title", "Profile")}</h2>
        <div class="profile-grid">
          <div><span class="muted">${t("route.profile.email", "Email")}</span><p>${escapeHtml(session.user.email || "-")}</p></div>
          <div><span class="muted">${t("route.profile.username", "Username")}</span><p>${escapeHtml(profile.username || "-")}</p></div>
          <div><span class="muted">${t("route.profile.fullName", "Name")}</span><p>${escapeHtml(profile.full_name || profile.display_name || "-")}</p></div>
        </div>
        <p>${escapeHtml(profile.bio || t("route.profile.bioEmpty", "No bio yet."))}</p>
      </article>
      <article class="app-panel">
        <h3>${t("route.profile.featuresTitle", "Your app sections")}</h3>
        <p>${t("route.profile.featuresBody", "Open deep product sections from Profile after signing in.")}</p>
        <div class="cta-actions">
          <a class="btn btn-outline" href="/discover" data-link-route="/discover">${t("appNav.discover", "Discover")}</a>
          <a class="btn btn-outline" href="/library" data-link-route="/library">${t("appNav.library", "Library")}</a>
          <a class="btn btn-outline" href="/social" data-link-route="/social">${t("appNav.social", "Social")}</a>
          <a class="btn btn-outline" href="/clubs" data-link-route="/clubs">${t("appNav.clubs", "Clubs")}</a>
          <a class="btn btn-outline" href="/reader" data-link-route="/reader">${t("appNav.reader", "Reader")}</a>
        </div>
      </article>
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
  `;
}

async function renderBookRoute() {
  const params = new URLSearchParams(window.location.search);
  const stableId = String(params.get("id") || "").trim();
  if (stableId) {
    try {
      const fetched = await fetchJson(`/api/books?type=detail&id=${encodeURIComponent(stableId)}`);
      const cover = fixCoverUrl(fetched.coverUrl);
      const title = escapeHtml(fetched.title || "Untitled");
      const author = escapeHtml(fetched.author || "Unknown Author");
      const meta = [
        fetched.publishedYear ? escapeHtml(String(fetched.publishedYear)) : "",
        fetched.publisher ? escapeHtml(String(fetched.publisher)) : "",
        Array.isArray(fetched.genres) && fetched.genres.length ? escapeHtml(fetched.genres.slice(0, 3).join(", ")) : "",
      ].filter(Boolean).join(" · ");
      const rating = fetched.googleRating != null ? `${Number(fetched.googleRating).toFixed(1)} / 5` : "No rating yet";
      const shareUrl = buildBookShareUrl(fetched);
      return `
        <section class="app-panel">
          <p><a class="btn btn-outline" href="/discover" data-link-route="/discover">← Back to Discover</a></p>
          <section class="pw-book-page-hero">
            <div class="pw-modal-cover">${cover ? `<img src="${escapeHtml(cover)}" alt="${title} cover" />` : "<div class=\"pw-poster-fallback\">PW</div>"}</div>
            <div>
              <h2>${title}</h2>
              <p>${author}</p>
              ${meta ? `<p class="muted">${meta}</p>` : ""}
              <p class="metric">Community rating: ${escapeHtml(rating)}</p>
              <div class="cta-actions">
                <button class="btn btn-outline" id="pw-book-page-copy">Copy share link</button>
                <a class="btn btn-outline" href="${escapeHtml(shareUrl)}">Open original link</a>
              </div>
              <div class="pw-canonical">
                <span class="muted">Canonical URL</span>
                <code>${escapeHtml(shareUrl)}</code>
              </div>
            </div>
          </section>
          <article class="app-panel">
            <h3>About this book</h3>
            <p>${escapeHtml(fetched.description || "No description yet.")}</p>
          </article>
        </section>
      `;
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
  const cover = fixCoverUrl(book.coverUrl);
  const title = escapeHtml(book.title || "Untitled");
  const author = escapeHtml(book.author || "Unknown Author");
  const meta = [
    book.publishedYear ? escapeHtml(String(book.publishedYear)) : "",
    book.publisher ? escapeHtml(String(book.publisher)) : "",
    Array.isArray(book.genres) && book.genres.length ? escapeHtml(book.genres.slice(0, 3).join(", ")) : "",
  ].filter(Boolean).join(" · ");
  const rating = book.googleRating != null ? `${Number(book.googleRating).toFixed(1)} / 5` : "No rating yet";
  const shareUrl = buildBookShareUrl(book);
  return `
    <section class="app-panel">
      <p><a class="btn btn-outline" href="/discover" data-link-route="/discover">← Back to Discover</a></p>
      <section class="pw-book-page-hero">
        <div class="pw-modal-cover">${cover ? `<img src="${escapeHtml(cover)}" alt="${title} cover" />` : "<div class=\"pw-poster-fallback\">PW</div>"}</div>
        <div>
          <h2>${title}</h2>
          <p>${author}</p>
          ${meta ? `<p class="muted">${meta}</p>` : ""}
          <p class="metric">Community rating: ${escapeHtml(rating)}</p>
          <div class="cta-actions">
            <button class="btn btn-outline" id="pw-book-page-copy">Copy share link</button>
            <a class="btn btn-outline" href="${escapeHtml(shareUrl)}">Open original link</a>
          </div>
        </div>
      </section>
      <article class="app-panel">
        <h3>About this book</h3>
        <p>${escapeHtml(book.description || "No description yet.")}</p>
      </article>
    </section>
  `;
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
  const moodButtons = document.querySelectorAll("[data-mood-chip]");
  for (let i = 0; i < moodButtons.length; i += 1) {
    moodButtons[i].addEventListener("click", () => {
      const v = String(moodButtons[i].getAttribute("data-mood-chip") || "");
      const moodInput = document.getElementById("pw-mood-input");
      if (moodInput) moodInput.value = v;
      discoverMood = v;
    });
  }
  const moodForm = document.getElementById("pw-mood-form");
  moodForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const moodInput = document.getElementById("pw-mood-input");
    const mood = String(moodInput?.value || "").trim();
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
    addButtons[i].addEventListener("click", async () => {
      try {
        const raw = addButtons[i].getAttribute("data-book");
        const status = addButtons[i].getAttribute("data-status") || "tbr";
        if (!raw || !session?.user?.id) return;
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

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = String(titleInput?.value || "").trim();
    const body = String(bodyInput?.value || "").trim();
    const rating = Number(ratingInput?.value || 5);
    const editId = String(editIdInput?.value || "");
    socialDraft = { title, body, rating: String(rating || 5) };
    if (!title || !body) {
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
      showBanner("success", t("route.social.editing", "Editing review. Save to apply changes."));
      window.scrollTo({ top: 0, behavior: "smooth" });
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
        duration_seconds: readerTimer.elapsedSeconds,
        minutes_read: Math.max(1, Math.round(readerTimer.elapsedSeconds / 60)),
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
    try {
      const { data: created, error } = await supabase
        .from("book_clubs")
        .insert({
          name,
          description: description || null,
          cover_emoji: emoji,
          created_by: session.user.id,
          max_members: maxMembers,
        })
        .select("id, invite_code")
        .single();
      if (error) throw error;
      const { error: memberErr } = await supabase
        .from("book_club_members")
        .insert({
          club_id: created.id,
          user_id: session.user.id,
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
      const { error: joinErr } = await supabase
        .from("book_club_members")
        .upsert({ club_id: club.id, user_id: session.user.id, role: "member" }, { onConflict: "club_id,user_id" });
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

  const quickJoinButtons = document.querySelectorAll("[data-club-quick-join]");
  for (let i = 0; i < quickJoinButtons.length; i += 1) {
    quickJoinButtons[i].addEventListener("click", async () => {
      await doJoinWithCode(quickJoinButtons[i].getAttribute("data-club-quick-join") || "");
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
  if (route === "/reader") return renderReader(supabase, session);
  if (route === "/profile") return renderProfile(supabase, session);
  return "";
}

async function renderRoute(supabase, session) {
  const route = APP_ROUTES.has(window.location.pathname) ? window.location.pathname : "/";
  setActiveRoute(route);
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
  requestAnimationFrame(() => root.classList.add("pw-route-enter"));
  const rerender = () => renderRoute(supabase, session);
  if (route === "/discover") bindDiscoverActions(supabase, session, rerender);
  if (route === "/library") bindLibraryActions(supabase, session, rerender);
  if (route === "/social") bindSocialActions(supabase, session, rerender);
  if (route === "/reader") bindReaderActions(supabase, session, rerender);
  if (route === "/clubs") bindClubsActions(supabase, session, rerender);
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
  }
  if (route === "/book") {
    const copyBtn = document.getElementById("pw-book-page-copy");
    copyBtn?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showBanner("success", "Book link copied.");
      } catch (_) {
        showBanner("error", "Could not copy link.");
      }
    });
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

  const render = async () => {
    await renderRoute(supabase, session);
  };

  initLinks(render);
  await render();

  supabase.auth.onAuthStateChange(async (_evt, newSession) => {
    session = newSession;
    await render();
  });
}

boot();
