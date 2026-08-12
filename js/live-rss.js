/* Nexora — live RSS pipeline.
   Fetches the real feed, normalizes each article, persists the
   batch to localStorage under `nexoraRSSStories` (so story.html
   can resolve ?id=...&rss=1 links), and feeds every RSS-eligible
   section on the page through the shared renderers in app.js. */
const RSS_API = "https://nexora-rss.bs535260.workers.dev/rss";
const RSS_REFRESH_MS = 4 * 60 * 1000;

const escapeHTML = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getSection = (category = "") => {
  const value = category.toLowerCase();
  if (value.includes("india") || value.includes("national")) return "India";
  if (value.includes("technology") || value.includes("tech") || value.includes("ai")) return "Technology";
  if (value.includes("business") || value.includes("economy") || value.includes("market")) return "Business";
  return "World";
};

const getTone = (section) => {
  if (section === "India") return "india";
  if (section === "Technology") return "tech";
  if (section === "Business") return "business";
  return "world";
};

const formatTime = (date) => {
  if (!date) return "Just now";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Just now";
  return parsed.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

// Stable, content-derived id so the same article always resolves
// to the same story.html link across page loads (the previous
// Date.now()-based id changed on every fetch and grew localStorage
// without bound).
const hashId = (str) => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) + h) + str.charCodeAt(i); h |= 0; }
  return "rss-" + Math.abs(h).toString(36);
};

// Read time is estimated from the real summary/title word count
// rather than a hard-coded "3 min read" for every story.
const estimateRead = (title, summary) => {
  const words = `${title} ${summary}`.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200)) + " min read";
};

const normalize = (article) => {
  const section = getSection(article.category);
  const tone = getTone(section);
  const title = article.title || "Untitled story";
  const summary = article.description || "";
  const category = escapeHTML(article.category || section);
  const source = escapeHTML(article.source || "Nexora Source");
  const time = formatTime(article.publishedAt);
  const link = typeof article.link === "string" && article.link.startsWith("http") ? article.link : "";
  const image = typeof article.image === "string" && article.image.startsWith("http") ? article.image : "";
  const id = hashId(`${link || title}`);

  return {
    id,
    title: escapeHTML(title),
    summary: escapeHTML(summary),
    source,
    time,
    category,
    topic: category,
    read: estimateRead(title, summary),
    image,
    url: link,
    tone,
    section,
    href: `story.html?id=${encodeURIComponent(id)}&rss=1`
  };
};

let hasLoadedOnce = false;

function setLiveLabel(isLive) {
  const label = document.getElementById("live-feed-label");
  if (!label) return;
  label.textContent = isLive ? "Live · updating automatically" : "Today's edition";
  label.closest(".eyebrow")?.classList.toggle("live-pulse", isLive);
}

function setUpdatedAt(text) {
  const el = document.getElementById("updated-at");
  if (el) el.textContent = text;
}

async function loadLiveRSS() {
  let articles;
  try {
    const response = await fetch(RSS_API, { cache: "no-store" });
    if (!response.ok) throw new Error(`RSS request failed: ${response.status}`);
    const data = await response.json();
    if (!data.success || !Array.isArray(data.articles)) throw new Error("Invalid RSS response");
    articles = data.articles;
  } catch (error) {
    console.error("Nexora RSS error:", error);
    if (!hasLoadedOnce) setLiveLabel(false);
    return;
  }

  const normalized = articles.map(normalize);

  try {
    localStorage.setItem("nexoraRSSStories", JSON.stringify(normalized.slice(0, 120)));
  } catch (error) {
    console.warn("Nexora RSS: could not persist stories to localStorage:", error);
  }

  const bySection = { India: [], World: [], Technology: [], Business: [] };
  normalized.forEach(a => { if (bySection[a.section]) bySection[a.section].push(a); });

  Object.entries(bySection).forEach(([name, list]) => {
    const el = document.querySelector(`[data-section="${name}"]`);
    if (el && list.length) window.NexoraCards?.renderInto(el, list.slice(0, 6));
  });

  const featuredEl = document.querySelector('[data-section="Featured"]');
  if (featuredEl && normalized.length) window.NexoraCards?.renderInto(featuredEl, normalized.slice(0, 1));

  const latestEl = document.querySelector('[data-section="Latest"]');
  if (latestEl && normalized.length > 1) window.NexoraCards?.renderInto(latestEl, normalized.slice(1, 9));

  const feedEl = document.querySelector('[data-section="LiveFeed"]');
  if (feedEl && normalized.length) window.NexoraCards?.renderInto(feedEl, normalized.slice(0, 8));

  const liveCount = document.getElementById("live-count");
  if (liveCount) liveCount.textContent = String(articles.length);

  hasLoadedOnce = true;
  setLiveLabel(true);
  setUpdatedAt("just now");

  console.log(`Nexora RSS loaded: ${articles.length} articles`);
}

loadLiveRSS();
setInterval(() => { if (!document.hidden) loadLiveRSS(); }, RSS_REFRESH_MS);
