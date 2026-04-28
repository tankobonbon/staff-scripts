// ==UserScript==
// @name         Kodansha Helper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Compact bottom-right helper for Kodansha.
// @match        https://kodansha.us/series/*
// @match        https://www.kodansha.us/series/*
// @run-at       document-idle
// @grant        GM_setClipboard
// @updateURL    https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/kodansha-book-helper.user.js
// @downloadURL  https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/kodansha-book-helper.user.js
// ==/UserScript==

(function () {
  'use strict';

  const PANEL_ID = 'tm-kod-box';

  function normalize(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
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
    const el = document.querySelector('#tm-kod-status');
    if (el) el.textContent = msg || '';
  }

  function getField(label) {
    const items = [...document.querySelectorAll('.volume-info__item')];

    for (const item of items) {
      const labelEl = item.querySelector('.volume-info__label');
      const valueEl = item.querySelector('.volume-info__value');

      if (!labelEl || !valueEl) continue;

      if (normalize(labelEl.textContent).toLowerCase() === label.toLowerCase()) {
        return normalize(valueEl.textContent);
      }
    }

    return '';
  }

  function getPage() {
    return getField('Pages');
  }

  function getISBN() {
    const cells = [...document.querySelectorAll('.volume-info__cell')];

    let printISBN = '';
    let digitalISBN = '';

    cells.forEach(cell => {
      const text = normalize(cell.textContent).toLowerCase();

      if (text.includes('print release')) {
        const match = normalize(cell.textContent).match(/ISBN\s*([0-9X]+)/i);
        if (match) printISBN = match[1];
      }

      if (text.includes('digital release')) {
        const match = normalize(cell.textContent).match(/ISBN\s*([0-9X]+)/i);
        if (match) digitalISBN = match[1];
      }
    });

    return printISBN || digitalISBN || '';
  }

  function getDate() {
    const print = getField('Print Release');
    const digital = getField('Digital Release');
    const raw = print || digital;

    if (!raw) return '';

    const parts = raw.split('/');
    if (parts.length !== 3) return '';

    const [m, d, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  function getAge() {
    const raw = getField('Rating').toLowerCase();

    if (raw.includes('18')) return 'Age Rating_Mature';
    if (raw.includes('17') || raw.includes('16') || raw.includes('15')) return 'Age Rating_Older Teen';
    if (raw.includes('13')) return 'Age Rating_Teen';
    if (raw.includes('10') || raw.includes('all')) return 'Age Rating_Everyone';

    return '';
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
      color: #000;
      padding: 10px;
      border-radius: 12px;
      border: 2px solid #000;
      box-shadow: 0 10px 26px rgba(0,0,0,.2);
      font-family: Arial, sans-serif;
      width: 240px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    panel.innerHTML = `
      <div id="tm-kod-status" style="
        background:#000;
        color:#fff;
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
        background:#000;
        color:#fff;
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
      if (!v) return setStatus('No pages');
      setStatus(await copy(v) ? `Copied ${v}` : 'Fail');
    };

    panel.querySelector('#a').onclick = async () => {
      const v = getAge();
      if (!v) return setStatus('No age');
      setStatus(await copy(v) ? `Copied ${v}` : 'Fail');
    };

    panel.querySelector('#pub').onclick = async () => {
      const v = 'Publisher_Kodansha Comics USA';
      setStatus(await copy(v) ? `Copied ${v}` : 'Fail');
    };

    panel.querySelector('#i').onclick = async () => {
      const v = 'Imprint_Kodansha Comics USA';
      setStatus(await copy(v) ? `Copied ${v}` : 'Fail');
    };

    panel.querySelector('#isbn').onclick = async () => {
      const v = getISBN();
      if (!v) return setStatus('No ISBN');
      setStatus(await copy(v) ? `Copied ${v}` : 'Fail');
    };

    panel.querySelector('#date').onclick = async () => {
      const v = getDate();
      if (!v) return setStatus('No date');
      setStatus(await copy(v) ? `Copied ${v}` : 'Fail');
    };
  }

  build();
  setTimeout(build, 1000);
  setTimeout(build, 2500);
})();
