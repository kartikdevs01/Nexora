/* Nexora — Live Weather module.
   Fully independent from js/live-rss.js: separate localStorage
   keys, separate fetches, separate render target (#weather-panel).
   Nothing here touches the RSS pipeline, and nothing in the RSS
   pipeline touches this.

   Data: Open-Meteo (https://open-meteo.com) — no API key required,
   so there is nothing to keep secret and nothing to proxy through
   a server. Forecast + geocoding are both free, keyless endpoints.
*/
(() => {
  const FORECAST_API = 'https://api.open-meteo.com/v1/forecast';
  const GEOCODE_API = 'https://geocoding-api.open-meteo.com/v1/search';
  const REVERSE_GEOCODE_API = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

  const CACHE_KEY = 'nexoraWeatherCache';
  const LOCATION_KEY = 'nexoraWeatherLocation';
  const FRESH_MS = 10 * 60 * 1000;      // reuse cached data without refetching
  const REFRESH_MS = 10 * 60 * 1000;    // background refresh cadence while tab is visible
  const DEFAULT_LOCATION = { name: 'New Delhi, India', lat: 28.61, lon: 77.21, source: 'default' };

  const panel = document.getElementById('weather-panel');
  if (!panel) return; // section not present on this page — nothing to do

  const esc = window.NexoraCards?.esc || (s => String(s ?? ''));
  const round2 = n => Math.round(n * 100) / 100;

  /* ---------------- WMO weather-code → condition + icon ---------------- */
  const ICONS = {
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z"/></svg>',
    'cloud-sun': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="2.4"/><path d="M8 2.8v1.2M4.2 4.2l.9.9M12.6 5.7l-1 1"/><path d="M10 18.5a4.2 4.2 0 0 1-.5-8.37A5.1 5.1 0 0 1 19.4 8a4.2 4.2 0 0 1-.5 10.5H10Z"/></svg>',
    'cloud-moon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.8 8.3A4.6 4.6 0 0 0 13 3a4.6 4.6 0 1 1-4.2 5.3Z"/><path d="M10 18.5a4.2 4.2 0 0 1-.5-8.37A5.1 5.1 0 0 1 19.4 8a4.2 4.2 0 0 1-.5 10.5H10Z"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96 5.5 5.5 0 0 1 10.7-2 4.5 4.5 0 0 1-.6 10.96H7Z"/></svg>',
    fog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M7 11.5a4.5 4.5 0 0 1-.5-8.97A5.5 5.5 0 0 1 17 4a4.5 4.5 0 0 1 .1 8.96"/><path d="M4 15h16M4 18.5h16"/></svg>',
    drizzle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 12.5a4.5 4.5 0 0 1-.6-8.96 5.5 5.5 0 0 1 10.7-2 4.5 4.5 0 0 1-.6 10.96H7Z"/><path d="M8 17v2M12 17v2M16 17v2"/></svg>',
    rain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 12.5a4.5 4.5 0 0 1-.6-8.96 5.5 5.5 0 0 1 10.7-2 4.5 4.5 0 0 1-.6 10.96H7Z"/><path d="M8 16.5 7 20M12.5 16.5l-1 3.5M17 16.5l-1 3.5"/></svg>',
    snow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M7 12.5a4.5 4.5 0 0 1-.6-8.96 5.5 5.5 0 0 1 10.7-2 4.5 4.5 0 0 1-.6 10.96H7Z"/><circle cx="8" cy="18" r=".6" fill="currentColor" stroke="none"/><circle cx="12" cy="19.5" r=".6" fill="currentColor" stroke="none"/><circle cx="16" cy="18" r=".6" fill="currentColor" stroke="none"/></svg>',
    thunder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 12.5a4.5 4.5 0 0 1-.6-8.96 5.5 5.5 0 0 1 10.7-2 4.5 4.5 0 0 1-.6 10.96H7Z"/><path d="M12.5 14.5 10 19h3l-1.5 3.5"/></svg>',
  };

  // [label, day-icon, night-icon]
  const WMO = {
    0: ['Clear sky', 'sun', 'moon'], 1: ['Mainly clear', 'sun', 'moon'],
    2: ['Partly cloudy', 'cloud-sun', 'cloud-moon'], 3: ['Overcast', 'cloud', 'cloud'],
    45: ['Fog', 'fog', 'fog'], 48: ['Rime fog', 'fog', 'fog'],
    51: ['Light drizzle', 'drizzle', 'drizzle'], 53: ['Drizzle', 'drizzle', 'drizzle'], 55: ['Dense drizzle', 'drizzle', 'drizzle'],
    56: ['Freezing drizzle', 'drizzle', 'drizzle'], 57: ['Freezing drizzle', 'drizzle', 'drizzle'],
    61: ['Light rain', 'rain', 'rain'], 63: ['Rain', 'rain', 'rain'], 65: ['Heavy rain', 'rain', 'rain'],
    66: ['Freezing rain', 'rain', 'rain'], 67: ['Heavy freezing rain', 'rain', 'rain'],
    71: ['Light snow', 'snow', 'snow'], 73: ['Snow', 'snow', 'snow'], 75: ['Heavy snow', 'snow', 'snow'], 77: ['Snow grains', 'snow', 'snow'],
    80: ['Light showers', 'rain', 'rain'], 81: ['Showers', 'rain', 'rain'], 82: ['Violent showers', 'rain', 'rain'],
    85: ['Snow showers', 'snow', 'snow'], 86: ['Heavy snow showers', 'snow', 'snow'],
    95: ['Thunderstorm', 'thunder', 'thunder'], 96: ['Thunderstorm, hail', 'thunder', 'thunder'], 99: ['Severe thunderstorm', 'thunder', 'thunder'],
  };
  const condition = (code, isDay) => {
    const entry = WMO[code] || ['Conditions unavailable', 'cloud', 'cloud'];
    return { label: entry[0], icon: isDay ? entry[1] : entry[2] };
  };
  const iconSvg = key => `<span class="weather-icon">${ICONS[key] || ICONS.cloud}</span>`;

  /* ---------------- cache + saved location ---------------- */
  const readJSON = key => { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } };
  const writeJSON = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full/unavailable — degrade silently */ } };

  const getSavedLocation = () => readJSON(LOCATION_KEY) || DEFAULT_LOCATION;
  const saveLocation = loc => writeJSON(LOCATION_KEY, { name: loc.name, lat: round2(loc.lat), lon: round2(loc.lon), source: loc.source });

  const getCache = () => readJSON(CACHE_KEY);
  const saveCache = (loc, data) => writeJSON(CACHE_KEY, { location: loc, data, fetchedAt: Date.now() });

  /* ---------------- network ---------------- */
  async function fetchForecast(lat, lon) {
    const url = `${FORECAST_API}?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset` +
      `&timezone=auto&forecast_days=7`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
    const raw = await res.json();
    if (!raw.current || !raw.daily) throw new Error('Unexpected weather response shape');

    const days = raw.daily.time.map((date, i) => ({
      date,
      code: raw.daily.weather_code[i],
      max: Math.round(raw.daily.temperature_2m_max[i]),
      min: Math.round(raw.daily.temperature_2m_min[i]),
      precip: raw.daily.precipitation_probability_max?.[i] ?? null,
    }));

    return {
      temp: Math.round(raw.current.temperature_2m),
      feelsLike: Math.round(raw.current.apparent_temperature),
      humidity: Math.round(raw.current.relative_humidity_2m),
      wind: Math.round(raw.current.wind_speed_10m),
      isDay: raw.current.is_day === 1,
      code: raw.current.weather_code,
      high: days[0]?.max, low: days[0]?.min, precip: days[0]?.precip,
      sunrise: raw.daily.sunrise?.[0], sunset: raw.daily.sunset?.[0],
      days,
    };
  }

  // Best-effort only: if this fails we simply keep the name the user
  // searched with, or fall back to a generic "Your location" label —
  // never blocks rendering of the actual weather data.
  async function reverseGeocode(lat, lon) {
    try {
      const res = await fetch(`${REVERSE_GEOCODE_API}?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.city || data.locality || data.principalSubdivision || null;
    } catch (e) { return null; }
  }

  async function searchCities(query) {
    const res = await fetch(`${GEOCODE_API}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`);
    if (!res.ok) throw new Error('City search failed');
    const data = await res.json();
    return (data.results || []).map(r => ({
      name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
      lat: r.latitude, lon: r.longitude,
    }));
  }

  /* ---------------- rendering ---------------- */
  const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDay = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });

  function renderSkeleton() {
    panel.innerHTML = `<div class="weather-card weather-skeleton" role="status" aria-label="Loading weather">
      <div class="weather-skel-row">
        <div class="weather-skel-block weather-skel-icon"></div>
        <div class="weather-skel-block weather-skel-line"></div>
      </div>
      <div class="weather-skel-row"><div class="weather-skel-block weather-skel-line short"></div></div>
    </div>`;
  }

  function renderError(message, onRetry) {
    panel.innerHTML = `<div class="weather-card weather-error">
      <span class="eyebrow">Weather unavailable</span>
      <p>${esc(message)}</p>
      <button class="button compact" type="button" id="weather-retry">Try again <span>→</span></button>
    </div>`;
    document.getElementById('weather-retry')?.addEventListener('click', onRetry);
  }

  function dayRow(day) {
    const c = condition(day.code, true);
    return `<div class="weather-day">
      <span class="weather-day-name">${fmtDay(day.date)}</span>
      ${iconSvg(c.icon)}
      <span class="weather-day-temps"><b>${day.max}°</b><span>${day.min}°</span></span>
      ${day.precip != null ? `<span class="weather-day-precip">${day.precip}%</span>` : ''}
    </div>`;
  }

  function renderWeather(loc, data, { stale = false, offline = false } = {}) {
    const c = condition(data.code, data.isDay);
    panel.innerHTML = `<div class="weather-card">
      <div class="weather-now">
        <div class="weather-now-main">
          ${iconSvg(c.icon)}
          <div class="weather-temp">${data.temp}<span class="weather-unit">°C</span></div>
          <div class="weather-copy">
            <div class="weather-condition">${esc(c.label)}</div>
            <div class="weather-place">${esc(loc.name)} <button class="weather-change-location" type="button" id="weather-change">Change</button></div>
          </div>
        </div>
        <div class="weather-stats">
          <div class="weather-stat"><span>Feels like</span><b>${data.feelsLike}°</b></div>
          <div class="weather-stat"><span>Humidity</span><b>${data.humidity}%</b></div>
          <div class="weather-stat"><span>Wind</span><b>${data.wind} km/h</b></div>
          <div class="weather-stat"><span>High / Low</span><b>${data.high}° / ${data.low}°</b></div>
          ${data.precip != null ? `<div class="weather-stat"><span>Precipitation</span><b>${data.precip}%</b></div>` : ''}
          ${data.sunset ? `<div class="weather-stat"><span>Sunset</span><b>${fmtTime(data.sunset)}</b></div>` : ''}
        </div>
      </div>
      <div class="weather-forecast">${data.days.map(dayRow).join('')}</div>
      <div class="weather-footnote">
        <span>${stale ? 'Showing last saved forecast' : 'Updated just now'} · Data via Open-Meteo</span>
        <button class="text-link" type="button" id="weather-use-location-inline">Use my location <span>→</span></button>
      </div>
      ${offline ? `<div class="weather-offline-note">You're offline — showing the last forecast saved on this device.</div>` : ''}
      <div class="weather-search" id="weather-search-slot" hidden></div>
    </div>`;

    document.getElementById('weather-change')?.addEventListener('click', showSearch);
    document.getElementById('weather-use-location-inline')?.addEventListener('click', useMyLocation);
    window.NexoraScroll?.observeReveals(panel);
  }

  function showSearch() {
    const slot = document.getElementById('weather-search-slot');
    if (!slot) return;
    slot.hidden = false;
    slot.innerHTML = `<input type="text" id="weather-city-input" placeholder="Search for a city…" autocomplete="off">
      <div class="weather-search-results" id="weather-city-results"></div>`;
    const input = document.getElementById('weather-city-input');
    const results = document.getElementById('weather-city-results');
    input.focus();
    let debounceId;
    input.addEventListener('input', () => {
      clearTimeout(debounceId);
      const q = input.value.trim();
      if (q.length < 2) { results.innerHTML = ''; return; }
      debounceId = setTimeout(async () => {
        try {
          const matches = await searchCities(q);
          results.innerHTML = matches.length
            ? matches.map((m, i) => `<button type="button" data-i="${i}">${esc(m.name)}<span>Select</span></button>`).join('')
            : `<div class="weather-search-empty">No cities matched "${esc(q)}".</div>`;
          results.querySelectorAll('button').forEach((btn, i) => btn.addEventListener('click', () => selectLocation(matches[i])));
        } catch (e) {
          results.innerHTML = `<div class="weather-search-empty">Search is unavailable right now. Please try again.</div>`;
        }
      }, 350);
    });
  }

  async function selectLocation(loc) {
    const location = { name: loc.name, lat: loc.lat, lon: loc.lon, source: 'search' };
    saveLocation(location);
    renderSkeleton();
    await loadFor(location, { showSearchOnFail: false });
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      renderError("This browser doesn't support location detection. Search for a city instead.", () => showSearch());
      showSearch();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = round2(pos.coords.latitude), lon = round2(pos.coords.longitude);
        const label = await reverseGeocode(lat, lon);
        const location = { name: label || 'Your location', lat, lon, source: 'geo' };
        saveLocation(location);
        await loadFor(location, { showSearchOnFail: false });
      },
      err => {
        // Permission denied or unavailable — leave whatever is currently
        // shown in place and offer manual search instead of erroring out.
        showSearch();
      },
      { timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  }

  /* ---------------- orchestration ---------------- */
  async function loadFor(location, { showSearchOnFail = true } = {}) {
    try {
      if (!navigator.onLine) throw new Error('offline');
      const data = await fetchForecast(location.lat, location.lon);
      saveCache(location, data);
      renderWeather(location, data);
    } catch (err) {
      const cache = getCache();
      if (cache && cache.location && cache.location.lat === location.lat && cache.location.lon === location.lon) {
        renderWeather(cache.location, cache.data, { stale: true, offline: !navigator.onLine });
      } else if (cache) {
        renderWeather(cache.location, cache.data, { stale: true, offline: !navigator.onLine });
      } else {
        renderError(
          navigator.onLine ? "Couldn't reach the weather service. Please try again." : "You're offline and no saved forecast is available yet.",
          () => loadFor(location, { showSearchOnFail })
        );
        if (showSearchOnFail) showSearch();
      }
    }
  }

  function init() {
    const cache = getCache();
    const location = getSavedLocation();

    if (cache) {
      const age = Date.now() - cache.fetchedAt;
      renderWeather(cache.location, cache.data, { stale: age > FRESH_MS });
      if (age < FRESH_MS) {
        // cache is fresh enough — skip the network round trip
      } else {
        loadFor(location);
      }
    } else {
      renderSkeleton();
      loadFor(location);
    }

    document.getElementById('weather-use-location')?.addEventListener('click', useMyLocation);

    window.addEventListener('online', () => loadFor(getSavedLocation()));
    setInterval(() => { if (!document.hidden) loadFor(getSavedLocation()); }, REFRESH_MS);
  }

  init();
})();
