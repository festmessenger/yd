/* FestMessenger — Updater & Hybrid Loader */
'use strict';

const Updater = (() => {
  const REPO_RAW = 'https://raw.githubusercontent.com/festmessenger/yd/main';
  const REPO_API = 'https://api.github.com/repos/festmessenger/yd';
  const CACHE_KEY = 'fm_cached_version';
  const CACHE_JS   = 'fm_cached_core_js';
  const CACHE_CSS  = 'fm_cached_theme_css';
  const CACHE_TS   = 'fm_cached_ts';
  const CACHE_TTL  = 60 * 60 * 1000; // 1 hour

  let currentVersion = '0.1.0';

  function setVersion(v) { currentVersion = v; }

  async function checkForUpdate() {
    try {
      const r = await fetch(`${REPO_RAW}/config.json?v=${Date.now()}`);
      if (!r.ok) return null;
      const cfg = await r.json();
      if (cfg.version && cfg.version !== currentVersion) {
        return cfg; // new version available
      }
      return null;
    } catch {
      return null;
    }
  }

  async function loadRemoteAssets(theme = 'light') {
    const lastTs = parseInt(localStorage.getItem(CACHE_TS) || '0');
    const isFresh = Date.now() - lastTs < CACHE_TTL;
    if (isFresh && localStorage.getItem(CACHE_JS)) return false; // use cache

    try {
      // Load theme CSS
      const cssR = await fetch(`${REPO_RAW}/themes/${theme}.css?v=${Date.now()}`);
      if (cssR.ok) {
        const css = await cssR.text();
        localStorage.setItem(CACHE_CSS + '_' + theme, css);
        applyCSS(css);
      }
      localStorage.setItem(CACHE_TS, Date.now().toString());
      return true;
    } catch {
      // Use cached
      const cached = localStorage.getItem(CACHE_CSS + '_' + theme);
      if (cached) applyCSS(cached);
      return false;
    }
  }

  function applyCSS(css) {
    let el = document.getElementById('fm-remote-theme');
    if (!el) { el = document.createElement('style'); el.id = 'fm-remote-theme'; document.head.appendChild(el); }
    el.textContent = css;
  }

  async function applyTheme(theme) {
    // Always try remote first
    const cached = localStorage.getItem('fm_cached_css_' + theme);
    if (cached) applyCSS(cached);
    try {
      const r = await fetch(`${REPO_RAW}/themes/${theme}.css`);
      if (r.ok) {
        const css = await r.text();
        localStorage.setItem('fm_cached_css_' + theme, css);
        applyCSS(css);
      }
    } catch {}
  }

  function showUpdateBanner(cfg) {
    const banner = document.getElementById('update-banner');
    if (!banner) return;
    banner.style.display = 'flex';
    banner.querySelector('.ub-ver').textContent = cfg.version;
    banner.querySelector('.ub-log').textContent = cfg.changelog || '';
  }

  return { checkForUpdate, loadRemoteAssets, applyTheme, setVersion, showUpdateBanner };
})();

window.Updater = Updater;
