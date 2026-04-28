// ==UserScript==
// @name         Shopify Floater for Collections
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds floating buttons on Shopify collection pages to open AniList and MangaUpdates links from collection metafields.
// @match        https://admin.shopify.com/store/*/collections/*
// @run-at       document-idle
// @updateURL    https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/shopify-floater-for-collections.user.js
// @downloadURL  https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/shopify-floater-for-collections.user.js
// ==/UserScript==

(function () {
  'use strict';

  const BUTTON_WRAP_ID = 'tbb-open-links-wrap';
  const ANILIST_BTN_ID = 'tbb-open-anilist-floating';
  const MU_BTN_ID = 'tbb-open-mu-floating';

  function normalize(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function getReadFieldTextFromAnchor(anchorId) {
    const anchor = document.getElementById(anchorId);
    if (!anchor) return '';

    const valueNode =
      anchor.querySelector('._ReadField_123bh_9') ||
      anchor.querySelector('._ReadWrapper_123bh_1') ||
      anchor.querySelector('[class*="ReadField"]') ||
      anchor.querySelector('[class*="ReadWrapper"]');

    if (!valueNode) return '';

    return normalize(valueNode.textContent || '');
  }

  function findAniListId() {
    const raw = getReadFieldTextFromAnchor('COLLECTION.metafields.custom.anilist_id-anchor');
    return /^\d+$/.test(raw) ? raw : '';
  }

  function findMangaUpdatesId() {
    const raw = getReadFieldTextFromAnchor('COLLECTION.metafields.custom.mangaupdates_id-anchor');
    return /^[a-z0-9]+$/i.test(raw) ? raw : '';
  }

  function makeBaseButton(id, text, background, color = '#111') {
    const btn = document.createElement('button');
    btn.id = id;
    btn.textContent = text;

    btn.style.background = background;
    btn.style.color = color;
    btn.style.border = 'none';
    btn.style.borderRadius = '10px';
    btn.style.padding = '10px 14px';
    btn.style.fontSize = '12px';
    btn.style.fontWeight = '700';
    btn.style.cursor = 'pointer';
    btn.style.width = '100%';

    btn.onmouseenter = () => { btn.style.opacity = '0.85'; };
    btn.onmouseleave = () => { btn.style.opacity = '1'; };

    return btn;
  }

  function createAniListButton() {
    const btn = makeBaseButton(ANILIST_BTN_ID, 'Open AniList', '#3DB4F2', '#fff');

    btn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();

      const anilistId = findAniListId();
      if (!anilistId) {
        alert('No AniList ID found.');
        return;
      }

      window.open(`https://anilist.co/manga/${encodeURIComponent(anilistId)}`, '_blank', 'noopener');
    };

    return btn;
  }

  function createMangaUpdatesButton() {
    const btn = makeBaseButton(MU_BTN_ID, 'Open MangaUpdates', '#6D28D9', '#fff');

    btn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();

      const muId = findMangaUpdatesId();
      if (!muId) {
        alert('No MangaUpdates ID found.');
        return;
      }

      window.open(`https://www.mangaupdates.com/series/${encodeURIComponent(muId)}`, '_blank', 'noopener');
    };

    return btn;
  }

  function createWrap() {
    const wrap = document.createElement('div');
    wrap.id = BUTTON_WRAP_ID;

    wrap.style.position = 'fixed';
    wrap.style.top = '70px';
    wrap.style.right = '22px';
    wrap.style.zIndex = '9999';
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '8px';
    wrap.style.width = '180px';

    wrap.appendChild(createAniListButton());
    wrap.appendChild(createMangaUpdatesButton());

    return wrap;
  }

  function inject() {
    const existing = document.getElementById(BUTTON_WRAP_ID);
    if (existing) return;

    document.body.appendChild(createWrap());
  }

  function boot() {
    const observer = new MutationObserver(() => {
      if (!document.getElementById(BUTTON_WRAP_ID)) {
        inject();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    let tries = 0;
    const interval = setInterval(() => {
      inject();
      tries++;
      if (tries > 60) {
        clearInterval(interval);
      }
    }, 500);
  }

  boot();
})();
