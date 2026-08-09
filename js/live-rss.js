const RSS_API = "https://nexora-rss.bs535260.workers.dev/rss";

const escapeHTML = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getSection = (category = "") => {
  const c = category.toLowerCase();

  if (c.includes("india")) return "India";
  if (c.includes("technology") || c.includes("tech") || c.includes("ai")) return "Technology";
  if (c.includes("business") || c.includes("economy") || c.includes("markets")) return "Business";
  return "World";
};

const formatTime = (date) => {
  if (!date) return "Just now";

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Just now";

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const createCard = (article) => {
  const title = escapeHTML(article.title || "Untitled story");
  const description = escapeHTML(article.description || "");
  const source = escapeHTML(article.source || "Nexora");
  const category = escapeHTML(article.category || "World");
  const image = article.image || "";
  const link = article.link || "#";

  return `
    <article class="story-card tone-${getSection(article.category).toLowerCase()}" tabindex="0">
      <a class="card-link" href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">
        ${
          image
            ? `
              <div class="card-image">
                <img
                  src="${escapeHTML(image)}"
                  alt=""
                  loading="lazy"
                  onerror="this.parentElement.style.display='none'"
                >
              </div>
            `
            : ""
        }

        <div class="card-content">
          <div class="card-kicker">
            ${category} · ${source}
          </div>

          <h3>${title}</h3>

          ${
            description
              ? `<p>${description}</p>`
              : ""
          }

          <div class="card-meta">
            ${formatTime(article.publishedAt)}
          </div>
        </div>
      </a>
    </article>
  `;
};

async function loadLiveRSS() {
  try {
    const response = await fetch(RSS_API, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`RSS request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.articles)) {
      throw new Error("Invalid RSS response");
    }

    const articles = data.articles;

    const sections = {
      India: document.querySelector('[data-section="India"]'),
      World: document.querySelector('[data-section="World"]'),
      Technology: document.querySelector('[data-section="Technology"]'),
      Business: document.querySelector('[data-section="Business"]')
    };

    Object.entries(sections).forEach(([section, container]) => {
      if (!container) return;

      const sectionArticles = articles
        .filter(article => getSection(article.category) === section)
        .slice(0, 6);

      if (!sectionArticles.length) return;

      container.innerHTML = sectionArticles
        .map(createCard)
        .join("");
    });

    const liveCount = document.querySelector(".hero-meta strong");

    if (liveCount) {
      liveCount.textContent = String(articles.length);
    }

    console.log(`Nexora RSS loaded: ${articles.length} articles`);
  } catch (error) {
    console.error("Nexora RSS error:", error);
  }
}

loadLiveRSS();
