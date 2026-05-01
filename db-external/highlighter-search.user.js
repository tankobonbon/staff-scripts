// ==UserScript==
// @name         Highlighter Search
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Highlight text and search it on MangaUpdates, AniList, MAL, Amazon, Amazon JP, or CMOA.
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
        { label: 'CMOA', color: '#FF9B32', text: '#fff', url: t => `https://www.cmoa.jp/search/result/?header_word=${encodeURIComponent(t)}` }
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
      menu.style.top = `${Math.min(e.clientY + 8, window.innerHeight - 260)}px`;
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
