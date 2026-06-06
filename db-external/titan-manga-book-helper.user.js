// ==UserScript==
// @name         Titan Manga Helper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Compact bottom-right helper for Titan Manga.
// @match        https://titan-comics.com/manga/*
// @match        https://www.titan-comics.com/manga/*
// @run-at       document-idle
// @grant        GM_setClipboard
// @updateURL    https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/titan-manga-book-helper.user.js
// @downloadURL  https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/titan-manga-book-helper.user.js
// ==/UserScript==

(function () {
  'use strict';

  const PANEL_ID = 'tm-titan-box';

  function normalizeText(text) {
    return (text || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeMultilineText(text) {
    return (text || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function elementToText(element) {
    if (!element) return '';

    const clone = element.cloneNode(true);
    clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
    clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    clone.querySelectorAll('p, div, li, blockquote, h1, h2, h3, h4, h5, h6').forEach(el => {
      el.insertAdjacentText('afterend', '\n');
    });

    return normalizeMultilineText(clone.textContent);
  }

  function richPayloadFromElement(element) {
    if (!element) return null;

    const html = element.innerHTML.trim();
    const text = elementToText(element);
    return html && text ? { html, text } : null;
  }

  function joinNames(names) {
    const seen = new Set();
    const cleaned = [];

    names.forEach(name => {
      const value = normalizeText(name)
        .replace(/^(?:by|author|artist|creator|story(?: and art)? by|art by)\s*:?\s*/i, '')
        .trim();
      const key = value.toLowerCase();

      if (value && !seen.has(key)) {
        seen.add(key);
        cleaned.push(value);
      }
    });

    return cleaned.join(', ');
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

  async function copyRich(html, text) {
    if (!html || !text) return false;

    try {
      if (navigator.clipboard?.write && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' })
          })
        ]);
        return true;
      }
    } catch (_) {}

    try {
      const holder = document.createElement('div');
      holder.contentEditable = 'true';
      holder.style.cssText = 'position:fixed;left:-99999px;top:0;opacity:0;pointer-events:none;';
      holder.innerHTML = html;
      document.body.appendChild(holder);

      const selection = window.getSelection();
      const savedRanges = [];
      for (let i = 0; i < selection.rangeCount; i++) savedRanges.push(selection.getRangeAt(i));

      const range = document.createRange();
      range.selectNodeContents(holder);
      selection.removeAllRanges();
      selection.addRange(range);

      const copied = document.execCommand('copy');
      selection.removeAllRanges();
      savedRanges.forEach(savedRange => selection.addRange(savedRange));
      holder.remove();

      if (copied) return true;
    } catch (_) {}

    return copy(text);
  }

  function makeISODate(year, month, day) {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    const date = new Date(Date.UTC(y, m - 1, d));

    if (
      date.getUTCFullYear() !== y ||
      date.getUTCMonth() + 1 !== m ||
      date.getUTCDate() !== d
    ) return '';

    return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function toISODate(raw) {
    const value = normalizeText(raw).replace(/(\d)(?:st|nd|rd|th)\b/gi, '$1');
    if (!value) return '';

    const months = {
      jan: 1, january: 1,
      feb: 2, february: 2,
      mar: 3, march: 3,
      apr: 4, april: 4,
      may: 5,
      jun: 6, june: 6,
      jul: 7, july: 7,
      aug: 8, august: 8,
      sep: 9, sept: 9, september: 9,
      oct: 10, october: 10,
      nov: 11, november: 11,
      dec: 12, december: 12
    };

    let match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) return makeISODate(match[1], match[2], match[3]);

    match = value.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
    if (match) return makeISODate(match[3], match[1], match[2]);

    match = value.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (match) {
      const month = months[match[1].toLowerCase()];
      return month ? makeISODate(match[3], month, match[2]) : '';
    }

    match = value.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (match) {
      const month = months[match[2].toLowerCase()];
      return month ? makeISODate(match[3], month, match[1]) : '';
    }

    return '';
  }

  function numericAgeRating(raw, allowNA = false) {
    const value = normalizeText(raw);
    if (allowNA && /^(?:n\/?a|not applicable|not available)$/i.test(value)) return 'Age Rating_N/A';
    if (/all ages|everyone/i.test(value)) return 'Age Rating_Everyone';

    const age = Number(value.match(/\d+/)?.[0]);
    if (!Number.isFinite(age)) return '';
    if (age <= 11) return 'Age Rating_Everyone';
    if (age <= 14) return 'Age Rating_Teen';
    if (age <= 17) return 'Age Rating_Older Teen';
    return 'Age Rating_Mature';
  }

function getDLValue(label, root = document) {
  const rows = [...root.querySelectorAll('dl > div, .issue_info dl > div')];

  for (const row of rows) {
    const dt = row.querySelector('dt');
    const dd = row.querySelector('dd');
    const key = normalizeText(dt?.textContent).replace(/:$/, '');
    if (dd && key.toLowerCase() === label.toLowerCase()) return normalizeText(dd.textContent);
  }

  return '';
}

function getSynopsis() {
  const roots = [...document.querySelectorAll('[itemprop="description"]')];
  const synopsis = roots.find(el =>
    /^Description$/i.test(normalizeText(el.querySelector('h3')?.textContent))
  ) || roots.find(el => normalizeText(el.textContent).length > 100);

  if (!synopsis) return null;

  const holder = document.createElement('div');
  [...synopsis.childNodes].forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE && node.matches('h1, h2, h3, h4')) return;
    holder.appendChild(node.cloneNode(true));
  });
  return richPayloadFromElement(holder);
}

function getAuthors() {
  const names = [...document.querySelectorAll('.people [itemprop="name"], [itemprop="contributor"] [itemprop="name"]')]
    .map(el => normalizeText(el.textContent))
    .filter(Boolean);

  if (names.length) return joinNames(names);

  return joinNames([...document.querySelectorAll('.people dd[itemprop="contributor"]')].map(el => el.textContent));
}

function getPage() {
  return getDLValue('Extent').match(/\d+/)?.[0]
    || normalizeText(document.querySelector('[itemprop="numberOfPages"]')?.textContent).match(/\d+/)?.[0]
    || '';
}

function getISBN() {
  return (getDLValue('Isbn') || normalizeText(document.querySelector('[itemprop="isbn"]')?.textContent))
    .replace(/[^0-9X]/gi, '')
    .toUpperCase();
}

function getReleaseDate() {
  return toISODate(getDLValue('Release Date') || normalizeText(document.querySelector('.issue_info .date dd')?.textContent));
}

function getAge() {
  return numericAgeRating(getDLValue('Age') || normalizeText(document.querySelector('[itemprop="typicalAgeRange"]')?.textContent));
}

function getPublisher() {
  return 'Publisher_Titan Manga';
}

function getImprint() {
  return 'Imprint_Titan Manga';
}


  function setStatus(msg) {
    const el = document.querySelector('#tm-titan-status');
    if (el) el.textContent = msg || '';
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
      background: #fff;
      color: #fff;
      padding: 10px;
      border-radius: 12px;

      box-shadow: 0 10px 26px rgba(0,0,0,.28);
      font-family: Arial, sans-serif;
      width: 240px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    panel.innerHTML = `
      <div id="tm-titan-status" style="
        background:#ccc;
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
        <button id="s">Synopsis</button>
        <button id="author">Author</button>
        <button id="p">Pages</button>
        <button id="a">Age</button>
        <button id="pub">Publisher</button>
        <button id="i">Imprint</button>
        <button id="isbn">ISBN</button>
        <button id="date">Date</button>
      </div>
    `;

    panel.querySelectorAll('button').forEach(btn => {
      btn.style.cssText = `
        background:#ccc;
        color:#111;
        border:none;
        border-radius:999px;
        padding:6px 8px;
        font-size:11px;
        font-weight:bold;
        cursor:pointer;
        box-shadow:none !important;
        filter:none !important;
        text-shadow:none !important;
      `;
    });

    document.body.appendChild(panel);

    panel.querySelector('#s').onclick = async () => {
      const synopsis = getSynopsis();
      if (!synopsis) return setStatus('No synopsis');
      setStatus(await copyRich(synopsis.html, synopsis.text) ? 'Copied synopsis' : 'Fail');
    };

    panel.querySelector('#author').onclick = async () => {
      const v = getAuthors();
      if (!v) return setStatus('No author');
      setStatus(await copy(v) ? `Copied ${v}` : 'Fail');
    };

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
      const v = getPublisher();
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
