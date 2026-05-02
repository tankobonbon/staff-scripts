// ==UserScript==
// @name         Highlighter Search
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Highlight text and search it on MangaUpdates, AniList, MAL, Amazon, Amazon JP, CMOA, Bookwalker, Shopify Product Search, or Bulk Edit.
// @match        https://admin.shopify.com/store/tankobonbon-manga-book-store/*
// @match        https://www.animenewsnetwork.com/*
// @match        https://animenewsnetwork.com/*
// @match        https://www.amazon.com/*
// @match        https://www.amazon.co.jp/*
// @match        https://airtable.com/*
// @match        https://x.com/*
// @match        https://twitter.com/*
// @match        https://sevenseasentertainment.com/*
// @match        https://yenpress.com/*
// @match        https://squareenixmangaandbooks.square-enix-games.com/*
// @match        https://vizmedia.com/*
// @match        https://kodansha.us/*
// @match        https://myanimelist.net/*
// @match        https://www.mangaupdates.com/*
// @match        https://cmoa.jp/*
// @match        https://anilist.co/*
// @match        https://bookwalker.com/*
// @match        https://www.bookwalker.com/*
// @match        https://discord.com/*
// @grant        none
// @updateURL    https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/highlighter-search.user.js
// @downloadURL  https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/highlighter-search.user.js
// ==/UserScript==

(function () {
  'use strict';

  let selectedText = '';

  const GROUPS = [
    {
      title: 'DB',
      items: [
        { label: 'MangaUpdates', color: '#5D6368', text: '#fff', url: t => `https://www.mangaupdates.com/series?search=${encodeURIComponent(t)}&licensed=yes&display=list&perpage=10` },
        { label: 'Anilist', color: '#06A9FF', text: '#fff', url: t => `https://anilist.co/search/manga?search=${encodeURIComponent(t)}` },
        { label: 'MAL', color: '#2D51A2', text: '#fff', url: t => `https://myanimelist.net/manga.php?q=${encodeURIComponent(t)}` },
        { label: 'Amazon EN', color: '#232F3E', text: '#fff', url: t => `https://www.amazon.com/s?k=${encodeURIComponent(t)}&i=stripbooks` },
        { label: 'Amazon JP', color: '#BE0126', text: '#fff', url: t => `https://www.amazon.co.jp/s?k=${encodeURIComponent(t)}&i=stripbooks` },
        { label: 'CMOA', color: '#FF9B32', text: '#fff', url: t => `https://www.cmoa.jp/search/result/?header_word=${encodeURIComponent(t)}` },
        { label: 'Bookwalker', color: '#23A7B1', text: '#fff', url: t => `https://bookwalker.com/browse?search=${encodeURIComponent(t)}` },
        { label: 'Product Search', color: '#98C14C', text: '#fff', url: t => `https://admin.shopify.com/store/tankobonbon-manga-book-store/products?savedViewId=1141953986818&query=-vendor%3A%22Tankobonbon%2CTankonbini%22+-product_type%3A%22Collectibles%22+${encodeURIComponent(t)}&order=title+asc&selectedColumns=IMAGE%2CTITLE%2CSTATUS%2CPRODUCT_TYPE%2CVENDOR%2CCREATED_AT%2CUPDATED_AT` },
        { label: 'Bulk Edit', color: '#649144', text: '#fff', url: t => `https://admin.shopify.com/store/tankobonbon-manga-book-store/bulk?resource_name=Product&edit=vendor%2Cmetafields.arena.genres%2Cmetafields.arena.author%2Cmetafields.arena.romaji%2Cmetafields.arena.japanese%2Cmetafields.arena.demography%2Cmetafields.arena.imprint%2Cmetafields.arena.publisher%2Cmetafields.custom.page_count%2Cmetafields.custom.series%2Cmetafields.custom.volume%2Cmetafields.custom.chapters%2Cmetafields.custom.extra_chapters%2Cmetafields.custom.sub_series%2Cmetafields.arena.availability%2Cmetafields.custom.preview%2Cmetafields.arena.release&return_to=%2Fstore%2Ftankobonbon-manga-book-store%2Fproducts&selectedView=all&query=${encodeURIComponent(t)}` }
      ]
    },
    {
      title: 'PUB',
      items: [
        { label: 'Yen Press', color: '#6EBE44', text: '#fff', url: t => `https://yenpress.com/search?q=${encodeURIComponent(t)}` },
        { label: 'VIZ Media', color: '#FF0000', text: '#fff', url: t => `https://www.viz.com/search?search=${encodeURIComponent(t)}` },
        { label: 'Seven Seas', color: '#00AEEF', text: '#fff', url: t => `https://sevenseasentertainment.com/?s=${encodeURIComponent(t)}` },
        { label: 'Kodansha', color: '#FFFFFF', text: '#111', url: t => `https://kodansha.us/search/?q=${encodeURIComponent(t)}` }
      ]
    }
  ];

  const menu = document.createElement('div');
  menu.style.position = 'fixed';
  menu.style.zIndex = '999999';
  menu.style.display = 'none';
  menu.style.padding = '5px';
  menu.style.borderRadius = '8px';
  menu.style.background = '#111';
  menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
  menu.style.fontFamily = 'Arial, sans-serif';
  menu.style.flexDirection = 'column';
  menu.style.gap = '3px';
  menu.style.minWidth = '120px';

  document.body.appendChild(menu);

  function getSelectedText() {
    return window.getSelection().toString().trim();
  }

  function hideMenu() {
    menu.style.display = 'none';
  }

  function openSearch(item) {
    if (!selectedText) return;
    window.open(item.url(selectedText), '_blank');
    hideMenu();
  }

  function makeHeader(text) {
    const h = document.createElement('div');
    h.textContent = text;
    h.style.fontSize = '9px';
    h.style.color = '#888';
    h.style.fontWeight = '700';
    h.style.margin = '2px 3px 0';
    return h;
  }

  function makeButton(item) {
    const btn = document.createElement('button');
    btn.textContent = item.label;

    btn.style.padding = '3px 6px';
    btn.style.border = item.color === '#FFFFFF' ? '1px solid #ddd' : '0';
    btn.style.borderRadius = '5px';
    btn.style.background = item.color;
    btn.style.color = item.text;
    btn.style.fontSize = '11px';
    btn.style.fontWeight = '600';
    btn.style.cursor = 'pointer';
    btn.style.textAlign = 'left';

    btn.addEventListener('click', () => openSearch(item));
    return btn;
  }

  function buildMenu() {
    menu.innerHTML = '';

    GROUPS.forEach(group => {
      menu.appendChild(makeHeader(group.title));
      group.items.forEach(item => menu.appendChild(makeButton(item)));
    });
  }

  buildMenu();

  document.addEventListener('mouseup', function (e) {
    setTimeout(() => {
      selectedText = getSelectedText();

      if (!selectedText) {
        hideMenu();
        return;
      }

      menu.style.left = `${Math.min(e.clientX + 8, window.innerWidth - 140)}px`;
      menu.style.top = `${Math.min(e.clientY + 8, window.innerHeight - 320)}px`;
      menu.style.display = 'flex';
    }, 10);
  });

  document.addEventListener('mousedown', function (e) {
    if (!menu.contains(e.target)) hideMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hideMenu();
  });
})();
