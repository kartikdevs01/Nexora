const RSS_API = "https://nexora-rss.bs535260.workers.dev/rss";

const escapeHTML = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getSection = (category = "") => {
  const value = category.toLowerCase();

  if (
    value.includes("india") ||
    value.includes("national")
  ) {
    return "India";
  }

  if (
    value.includes("technology") ||
    value.includes("tech") ||
    value.includes("ai")
  ) {
    return "Technology";
  }

  if (
    value.includes("business") ||
    value.includes("economy") ||
    value.includes("market")
  ) {
    return "Business";
  }

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

  if (Number.isNaN(parsed.getTime())) {
    return "Just now";
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const createCard = (article, index) => {
  const section = getSection(article.category);
  const tone = getTone(section);

  const title = escapeHTML(
    article.title || "Untitled story"
  );

  const summary = escapeHTML(
    article.description || ""
  );

  const category = escapeHTML(
    article.category || section
  );

  const source = escapeHTML(
    article.source || "Nexora Source"
  );

  const time = formatTime(
    article.publishedAt
  );

  const topic = category;

  const read = "3 min read";

  const id = `rss-${Date.now()}-${index}`;

  const link =
    typeof article.link === "string" &&
    article.link.startsWith("http")
      ? article.link
      : "#";

  const image =
    typeof article.image === "string" &&
    article.image.startsWith("http")
      ? article.image
      : "";

  const imageHTML = image
    ? `
      <div class="card-art">
        <img
          src="${escapeHTML(image)}"
          alt=""
          loading="lazy"
          onerror="this.style.display='none'"
        >
        <span>${category}</span>
        <i></i>
      </div>
    `
    : `
      <div class="card-art">
        <span>${category}</span>
        <i></i>
      </div>
    `;

  return `
    <article
      class="story-card tone-${tone}"
      tabindex="0"
    >
      <a
        class="card-link"
        href="${escapeHTML(link)}"
        rel="noopener noreferrer"
        aria-label="Read ${title}"
      ></a>

      ${imageHTML}

      <div class="card-copy">
        <div class="story-meta">
          <span>${topic}</span>
          <span>${read}</span>
        </div>

        <h3>${title}</h3>

        <p>${summary}</p>

        <div class="card-bottom">
          <span>${source} · ${time}</span>

          <div>
            <button
              class="action bookmark"
              aria-label="Bookmark"
            >
              ♡
            </button>

            <button
              class="action share"
              aria-label="Share"
            >
              ↗
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
};

async function loadLiveRSS() {
  try {
    const response = await fetch(
      RSS_API,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `RSS request failed: ${response.status}`
      );
    }

    const data = await response.json();

    if (
      !data.success ||
      !Array.isArray(data.articles)
    ) {
      throw new Error(
        "Invalid RSS response"
      );
    }

    const articles = data.articles;

    const containers = {
      India: document.querySelector(
        '[data-section="India"]'
      ),

      World: document.querySelector(
        '[data-section="World"]'
      ),

      Technology: document.querySelector(
        '[data-section="Technology"]'
      ),

      Business: document.querySelector(
        '[data-section="Business"]'
      )
    };

    Object.entries(containers).forEach(
      ([section, container]) => {
        if (!container) return;

        const matchingArticles =
          articles
            .filter(
              article =>
                getSection(
                  article.category
                ) === section
            )
            .slice(0, 4);

        if (!matchingArticles.length) {
          return;
        }

        container.innerHTML =
          matchingArticles
            .map(createCard)
            .join("");
      }
    );

    const liveCount =
      document.querySelector(
        ".hero-meta strong"
      );

    if (liveCount) {
      liveCount.textContent =
        String(articles.length);
    }

    console.log(
      `Nexora RSS loaded: ${articles.length} articles`
    );
  } catch (error) {
    console.error(
      "Nexora RSS error:",
      error
    );
  }
}

loadLiveRSS();
