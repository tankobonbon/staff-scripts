// ==UserScript==
// @name         Seven Seas Helper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Compact bottom-right helper for Seven Seas.
// @match        https://sevenseasentertainment.com/books/*
// @match        https://www.sevenseasentertainment.com/books/*
// @run-at       document-idle
// @grant        GM_setClipboard
// @updateURL    https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/sevenseas-book-helper.user.js
// @downloadURL  https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/sevenseas-book-helper.user.js
// ==/UserScript==

(function () {
  'use strict';

  const PANEL_ID = 'tm-ss-box';

  function normalizeText(text) {
    return (text || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async function copy(text) {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {}
    try {
      GM_setClipboard(text, 'text');
      return true;
    } catch (_) {}
    return false;
  }

  function setStatus(msg) {
    const el = document.querySelector('#tm-ss-status');
    if (el) el.textContent = msg || '';
  }

  function getMetaRoot() {
    return document.querySelector('#volume-meta');
  }

  function getPageText() {
    return normalizeText(document.body.textContent);
  }

  function getField(label) {
    const root = getMetaRoot();
    if (!root) return '';

    const paragraphs = [...root.querySelectorAll('p')];

    for (const p of paragraphs) {
      const text = normalizeText(p.textContent);
      const pattern = new RegExp(`^${label}\\s*:`, 'i');

      if (pattern.test(text)) {
        return normalizeText(text.replace(pattern, ''));
      }
    }

    return '';
  }

  function getPage() {
    const raw = getField('Page Count');
    return raw.match(/\d+/)?.[0] || '';
  }

  function getISBN() {
    const raw = getField('ISBN');
    return raw.replace(/[^0-9X]/gi, '');
  }

  function getReleaseDate() {
    const raw = getField('Release Date');
    if (!raw) return '';

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return '';

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
  }

    function getAge() {
        const ratingEl = [...document.querySelectorAll('#volume-cover .age-rating[id]')]
        .find(el => !/-block$/i.test(el.id));

        const id = (ratingEl?.id || '').toLowerCase();

        if (id.includes('mature')) return 'Age Rating_Mature';
        if (id.includes('older')) return 'Age Rating_Older Teen';
        if (id.includes('teen')) return 'Age Rating_Teen';
        if (id.includes('ten') || id.includes('10')) return 'Age Rating_Everyone';

        const text = (ratingEl?.textContent || '').toLowerCase();
        if (text.includes('10')) return 'Age Rating_Everyone';

        return '';
    }

    function getImprint() {
        const imprintEl = [...document.querySelectorAll('#volume-cover .age-rating[id]')]
        .find(el => /-block$/i.test(el.id));

        const raw = normalizeText(imprintEl?.textContent || '').toLowerCase();

        if (raw.includes('airship')) return 'Imprint_Airship';
        if (raw.includes('ghost ship')) return 'Imprint_Ghost Ship';
        if (raw.includes('steamship')) return 'Imprint_Steamship';

        return 'Imprint_Seven Seas';
    }

  function build() {
    document.getElementById(PANEL_ID)?.remove();

    const panel = document.createElement('div');
    panel.id = PANEL_ID;

    panel.style.cssText = `
      position: fixed;
      right: 14px;
      bottom: 14px;
      z-index: 2147483647;
      background: #111;
      color: #fff;
      padding: 10px;
      border-radius: 12px;
      box-shadow: 0 10px 26px rgba(0,0,0,.35);
      font-family: Arial, sans-serif;
      width: 240px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    panel.innerHTML = `
      <div id="tm-ss-status" style="
        background:#fff;
        color:#111;
        border-radius:10px;
        padding:8px;
        font-size:11px;
        line-height:1.3;
      ">Ready.</div>

      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:6px;
      ">
        <button id="p">Pages</button>
        <button id="a">Age</button>
        <button id="pub">Publisher</button>
        <button id="i">Imprint</button>
        <button id="isbn">ISBN</button>
        <button id="date">Date</button>
      </div>
    `;

    const styleBtn = (btn) => {
      btn.style.cssText = `
        background:#fff;
        color:#111;
        border:none;
        border-radius:999px;
        padding:6px 8px;
        font-size:11px;
        font-weight:bold;
        cursor:pointer;
      `;
    };

    panel.querySelectorAll('button').forEach(styleBtn);

    document.body.appendChild(panel);

    panel.querySelector('#p').onclick = async () => {
      const v = getPage();
      if (!v) return setStatus('No page count');
      setStatus(await copy(v) ? `Copied ${v}` : 'Fail');
    };

    panel.querySelector('#a').onclick = async () => {
      const v = getAge();
      if (!v) return setStatus('No age rating');
      setStatus(await copy(v) ? `Copied ${v}` : 'Fail');
    };

    panel.querySelector('#pub').onclick = async () => {
      const v = 'Publisher_Seven Seas';
      setStatus(await copy(v) ? `Copied ${v}` : 'Fail');
    };

    panel.querySelector('#i').onclick = async () => {
      const v = getImprint();
      if (!v) return setStatus('No imprint');
      setStatus(await copy(v) ? `Copied ${v}` : 'Fail');
    };

    panel.querySelector('#isbn').onclick = async () => {
      const v = getISBN();
      if (!v) return setStatus('No ISBN');
      setStatus(await copy(v) ? `Copied ${v}` : 'Fail');
    };

    panel.querySelector('#date').onclick = async () => {
      const v = getReleaseDate();
      if (!v) return setStatus('No release date');
      setStatus(await copy(v) ? `Copied ${v}` : 'Fail');
    };
  }

  build();
  setTimeout(build, 1000);
  setTimeout(build, 2500);
})();
