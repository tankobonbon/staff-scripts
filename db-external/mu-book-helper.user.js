// ==UserScript==
// @name         MangaUpdates Helper - Metafield copy + Amazon JP button
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a compact helper box above the title on MangaUpdates series pages for copying metadata and opening Amazon JP search.
// @match        https://www.mangaupdates.com/series/*
// @run-at       document-idle
// @grant        GM_setClipboard
// @updateURL    https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/mu-book-helper.user.js
// @downloadURL  https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/mu-book-helper.user.js
// ==/UserScript==

(function () {
  'use strict';

  const BOX_ID = 'tm-mu-helper-box';

  function normalizeWhitespace(text) {
    return (text || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getText(selector) {
    const el = document.querySelector(selector);
    return el ? normalizeWhitespace(el.textContent || '') : '';
  }

  function getTitle() {
    return getText('.releasestitle.tabletitle') || getText('[data-cy="series-title"]');
  }

  function getType() {
    return getText('[data-cy="info-box-type"]');
  }

  function getAssociatedNames() {
    const container = document.querySelector('[data-cy="info-box-associated"]');
    if (!container) return [];

    return Array.from(container.querySelectorAll('div'))
      .map(div => normalizeWhitespace(div.textContent || ''))
      .filter(Boolean);
  }

  function looksJapanese(text) {
    return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
  }

  function looksKorean(text) {
    return /[\uac00-\ud7af]/.test(text);
  }

  function looksChinese(text) {
    return /[\u4e00-\u9fff]/.test(text) &&
      !/[\u3040-\u30ff]/.test(text) &&
      !/[\uac00-\ud7af]/.test(text);
  }

  function getOriginalTitle(type) {
    const names = getAssociatedNames();
    if (!names.length) return '';

    if (/manhwa/i.test(type)) return names.find(looksKorean) || '';
    if (/manhua/i.test(type)) return names.find(looksChinese) || '';
    return names.find(looksJapanese) || '';
  }

  function getGenres() {
    const container = document.querySelector('[data-cy="info-box-genres"]');
    if (!container) return [];

    const genres = Array.from(container.querySelectorAll('a'))
      .map(a => normalizeWhitespace(a.textContent || ''))
      .filter(Boolean)
      .filter(text => !/^Search for series of same genre/i.test(text));

    return [...new Set(genres)];
  }

  function getDemography(genres) {
    const demoList = ['Seinen', 'Shounen', 'Josei', 'Shoujo'];
    return genres.find(g => demoList.includes(g)) || 'N/A';
  }

  function getGenreOnly(genres) {
    const demoSet = new Set(['Seinen', 'Shounen', 'Josei', 'Shoujo']);
    return genres.filter(g => !demoSet.has(g));
  }

  function toShopifyGenreTags(genres) {
    return genres.map(g => `Genre_${g}`).join(',');
  }

  function toShopifyDemographyTag(demography) {
    return `Demographic_${demography}`;
  }

  function getStatusRaw() {
    return getText('[data-cy="info-box-status"]');
  }

  function mapStatus(statusRaw) {
    const s = normalizeWhitespace(statusRaw).toLowerCase();
    if (!s) return '';
    if (s.includes('(complete)') || s.includes('complete')) return 'Complete';
    if (s.includes('hiatus')) return 'Hiatus';
    if (s.includes('cancel')) return 'Cancelled';
    if (s.includes('ongoing')) return 'Ongoing';
    return statusRaw;
  }

  function toShopifyStatusTag(status) {
    if (!status) return '';
    const mapped = status === 'Complete' ? 'Completed' : status;
    return `Status_${mapped}`;
  }

  function buildAmazonJpUrl(originalTitle) {
    if (!originalTitle) return '';
    return `https://www.amazon.co.jp/s?k=${encodeURIComponent(originalTitle)}&i=stripbooks`;
  }

  function buildPacket() {
    const title = getTitle();
    const type = getType();
    const originalTitle = getOriginalTitle(type);
    const allGenres = getGenres();
    const demography = getDemography(allGenres);
    const genreOnly = getGenreOnly(allGenres);
    const status = mapStatus(getStatusRaw());

    return {
      title,
      type,
      originalTitle,
      genresPipe: genreOnly.join('|'),
      genresShopify: toShopifyGenreTags(genreOnly),
      demography,
      demographyTag: toShopifyDemographyTag(demography),
      status,
      statusTag: toShopifyStatusTag(status),
      amazonJpUrl: buildAmazonJpUrl(originalTitle)
    };
  }

  async function copyText(text) {
    if (!text) return false;

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {}

    try {
      GM_setClipboard(text, 'text');
      return true;
    } catch (_) {}

    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (_) {
      document.body.removeChild(ta);
      return false;
    }
  }

  function applyStyles(el, styles) {
    Object.assign(el.style, styles);
  }

  function makeButton(label, action, isWide = false) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.action = action;
    btn.textContent = label;

    applyStyles(btn, {
      appearance: 'none',
      border: '1px solid #666',
      background: 'linear-gradient(#4a4a4a, #2f2f2f)',
      color: '#fff',
      borderRadius: '3px',
      padding: '6px 8px',
      cursor: 'pointer',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontWeight: '700',
      lineHeight: '1.1',
      textAlign: 'center',
      minHeight: '30px',
      width: '100%',
      boxSizing: 'border-box'
    });
    if (isWide) {
      btn.style.gridColumn = '1 / -1';
    }

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'linear-gradient(#575757, #353535)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'linear-gradient(#4a4a4a, #2f2f2f)';
    });

    return btn;
  }

  function findInsertTarget() {
    return (
      document.querySelector('.releasestitle.tabletitle')?.closest('.col-12.p-2') ||
      document.querySelector('.releasestitle.tabletitle')?.parentElement ||
      document.querySelector('.p-2.pt-2.pb-2.text') ||
      document.querySelector('main') ||
      document.body
    );
  }

  function createBox() {
    const old = document.getElementById(BOX_ID);
    if (old) old.remove();

    const target = findInsertTarget();
    if (!target) return;

    const box = document.createElement('div');
    box.id = BOX_ID;

    applyStyles(box, {
      margin: '6px 0 10px 0',
      padding: '8px',
      background: '#2b2b2b',
      border: '1px solid #555',
      color: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      fontFamily: 'Arial, sans-serif'
    });

    const title = document.createElement('div');
    title.textContent = 'MangaUpdates Helper';
    applyStyles(title, {
      fontSize: '12px',
      fontWeight: '700',
      color: '#fff',
      marginBottom: '6px'
    });

    const actions = document.createElement('div');
    applyStyles(actions, {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: '6px'
    });

    const status = document.createElement('div');
    status.dataset.field = 'statusText';
    applyStyles(status, {
      marginTop: '6px',
      minHeight: '14px',
      fontSize: '11px',
      color: '#d7e0e8',
      whiteSpace: 'pre-wrap'
    });

    const buttons = [
      ['Copy Title', 'copy-title'],
      ['Copy Original Title', 'copy-original-title'],
      ['Copy Genres', 'copy-genres'],
      ['Copy Genre Tags', 'copy-genres-shopify'],
      ['Copy Demography', 'copy-demography'],
      ['Copy Demography Tag', 'copy-demography-shopify'],
      ['Copy Status Tag', 'copy-status-shopify'],
      ['Amazon JP', 'search-amazon-jp']
    ];

    buttons.forEach(([label, action, wide]) => {
      actions.appendChild(makeButton(label, action, !!wide));
    });

    box.appendChild(title);
    box.appendChild(actions);
    box.appendChild(status);

    if (target === document.body) {
      document.body.prepend(box);
    } else {
      target.prepend(box);
    }

    let packet = buildPacket();

    function render() {
      packet = buildPacket();
      status.textContent = '';
    }

    render();

    box.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;

      if (action === 'search-amazon-jp') {
        if (packet.amazonJpUrl) {
          window.open(packet.amazonJpUrl, '_blank', 'noopener,noreferrer');
          status.textContent = 'Amazon JP search opened.';
        } else {
          status.textContent = 'No original title found.';
        }
        return;
      }

      const map = {
        'copy-title': packet.title,
        'copy-original-title': packet.originalTitle,
        'copy-genres': packet.genresPipe,
        'copy-genres-shopify': packet.genresShopify,
        'copy-demography': packet.demography,
        'copy-demography-shopify': packet.demographyTag,
        'copy-status-shopify': packet.statusTag
      };

      if (action in map) {
        const value = map[action];
        const ok = await copyText(value);
        status.textContent = ok ? `${value} copied.` : 'Nothing to copy.';
      }
    });
  }

  function boot() {
    createBox();
  }

  const start = () => setTimeout(boot, 1200);

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    start();
  } else {
    window.addEventListener('DOMContentLoaded', start, { once: true });
  }
})();
