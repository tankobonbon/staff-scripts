// ==UserScript==
// @name         Highlighter Search
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Highlight text and search it on MangaUpdates, AniList, MAL, Amazon, Amazon JP, or CMOA.
// @match        https://www.animenewsnetwork.com/*
// @match        https://animenewsnetwork.com/*
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

  const SEARCHES = [
    {
      label: 'MangaUpdates',
      color: '#5D6368',
      url: text =>
        `https://www.mangaupdates.com/series?search=${encodeURIComponent(text)}&licensed=yes&display=list&perpage=10`
    },
    {
      label: 'AniList',
      color: '#06A9FF',
      url: text =>
        `https://anilist.co/search/manga?search=${encodeURIComponent(text)}`
    },
    {
      label: 'MAL',
      color: '#2D51A2',
      url: text =>
        `https://myanimelist.net/manga.php?q=${encodeURIComponent(text)}`
    },
    {
      label: 'Amazon',
      color: '#232F3E',
      url: text =>
        `https://www.amazon.com/s?k=${encodeURIComponent(text)}&i=stripbooks`
    },
    {
      label: 'Amazon JP',
      color: '#BE0126',
      url: text =>
        `https://www.amazon.co.jp/s?k=${encodeURIComponent(text)}&i=stripbooks`
    },
    {
      label: 'CMOA',
      color: '#FF9B32',
      url: text =>
        `https://www.cmoa.jp/search/result/?header_word=${encodeURIComponent(text)}`
    }
  ];

  const menu = document.createElement('div');
  menu.style.position = 'fixed';
  menu.style.zIndex = '999999';
  menu.style.display = 'none';
  menu.style.padding = '6px';
  menu.style.borderRadius = '10px';
  menu.style.background = '#111';
  menu.style.boxShadow = '0 6px 16px rgba(0,0,0,0.25)';
  menu.style.fontFamily = 'Arial, sans-serif';
  menu.style.display = 'flex';
  menu.style.flexDirection = 'column';
  menu.style.gap = '4px';

  document.body.appendChild(menu);

  let selectedText = '';

  function getSelectedText() {
    return window.getSelection().toString().trim();
  }

  function hideMenu() {
    menu.style.display = 'none';
  }

  function openSearch(search) {
    if (!selectedText) return;
    window.open(search.url(selectedText), '_blank');
    hideMenu();
  }

  function buildMenu() {
    menu.innerHTML = '';

    SEARCHES.forEach(search => {
      const btn = document.createElement('button');
      btn.textContent = search.label;

      btn.style.padding = '5px 10px';
      btn.style.border = '0';
      btn.style.borderRadius = '6px';
      btn.style.background = search.color;
      btn.style.color = '#fff';
      btn.style.fontSize = '12px';
      btn.style.fontWeight = '600';
      btn.style.cursor = 'pointer';
      btn.style.textAlign = 'left';

      btn.addEventListener('click', () => openSearch(search));

      menu.appendChild(btn);
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

      menu.style.left = `${Math.min(e.clientX + 10, window.innerWidth - 160)}px`;
      menu.style.top = `${Math.min(e.clientY + 10, window.innerHeight - 220)}px`;
      menu.style.display = 'flex';
    }, 10);
  });

  document.addEventListener('mousedown', function (e) {
    if (!menu.contains(e.target)) {
      hideMenu();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hideMenu();
  });
})();
