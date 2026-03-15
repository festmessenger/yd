/* FestMessenger — i18n engine */
'use strict';

const I18n = (() => {
  let _strings = {};
  let _lang = 'ru';
  const REPO = 'https://festmessenger.github.io/yd';
  const CACHE_KEY = 'fm_i18n_';
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

  async function load(lang) {
    _lang = lang || localStorage.getItem('fm_lang') || 'ru';
    // Try cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY + _lang);
      if (cached) {
        const { ts, data } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) { _strings = data; return; }
      }
    } catch {}
    // Try remote
    try {
      const r = await fetch(`${REPO}/i18n/${_lang}.json?v=${Date.now()}`);
      if (r.ok) {
        _strings = await r.json();
        localStorage.setItem(CACHE_KEY + _lang, JSON.stringify({ ts: Date.now(), data: _strings }));
        return;
      }
    } catch {}
    // Fallback to embedded
    _strings = window._FM_STRINGS || {};
  }

  function t(key, vars = {}) {
    const parts = key.split('.');
    let val = _strings;
    for (const p of parts) { val = val?.[p]; }
    if (typeof val !== 'string') return key;
    return val.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  }

  function setLang(lang) {
    localStorage.setItem('fm_lang', lang);
    load(lang).then(() => applyAll());
  }

  function getLang() { return _lang; }

  // Apply translations to DOM elements with data-i18n attribute
  function applyAll() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = t(key);
      if (val !== key) {
        if (el.dataset.i18nAttr) el.setAttribute(el.dataset.i18nAttr, val);
        else if (el.dataset.i18nHtml) el.innerHTML = val;
        else el.textContent = val;
      }
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const val = t(el.dataset.i18nPh);
      if (val !== el.dataset.i18nPh) el.placeholder = val;
    });
  }

  return { load, t, setLang, getLang, applyAll };
})();

window.I18n = I18n;
window.t = (key, vars) => I18n.t(key, vars);
