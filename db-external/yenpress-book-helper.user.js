// ==UserScript==
// @name         Yen Press Helper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Compact bottom-right helper for Yen Press.
// @match        https://yenpress.com/titles/*
// @match        https://www.yenpress.com/titles/*
// @run-at       document-idle
// @grant        GM_setClipboard
// @updateURL    https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/yenpress-book-helper.user.js
// @downloadURL  https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/yenpress-book-helper.user.js
// ==/UserScript==

(function () {
  'use strict';

  const PANEL_ID = 'tm-yp-box';

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
    const el = document.querySelector('#tm-yp-status');
    if (el) el.textContent = msg || '';
  }

  function getRoot() {
    return document.querySelector('.book-details .detail.active .detail-info')
      || document.querySelector('.book-details .detail-info');
  }

  function getField(label) {
    const root = getRoot();
    if (!root) return '';

    const candidates = [
      ...root.querySelectorAll('.detail-box'),
      ...Array.from(root.children)
    ];

    for (const box of candidates) {
      const labelEl = [...box.querySelectorAll('.type, span')]
        .find(el => normalizeText(el.textContent).toLowerCase() === label.toLowerCase());

      if (!labelEl) continue;

      const infoEl = box.querySelector('.info');
      if (!infoEl) continue;

      return normalizeText(infoEl.textContent);
    }

    return '';
  }

  function getPage() {
    const raw = getField('Page Count');
    return raw.match(/\d+/)?.[0] || '';
  }

  function getAge() {
    const raw = getField('Age Rating');

    if (/^T\s*\(Teen\)$/i.test(raw)) return 'Age Rating_Teen';
    if (/^OT\s*\(Older Teen\)$/i.test(raw)) return 'Age Rating_Older Teen';
    if (/^18\+\s*M\s*\(Mature\)$/i.test(raw)) return 'Age Rating_Mature';
    if (/^18\+\s*\(Mature\)$/i.test(raw)) return 'Age Rating_Mature';
    if (/^All Ages$/i.test(raw)) return 'Age Rating_Everyone';

    return '';
  }

  function getImprint() {
    const raw = getField('Imprint');

    if (/^J-Novel Club$/i.test(raw)) return 'Imprint_JNC';
    if (/^Ize Press$/i.test(raw)) return 'Imprint_Ize Press';
    if (/^Yen On$/i.test(raw)) return 'Imprint_Yen On';
    if (/^Yen Press$/i.test(raw)) return 'Imprint_Yen Press';
    if (/^Avocado House$/i.test(raw)) return 'Imprint_Avocado House';

    return raw ? `Imprint_${raw}` : '';
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
      background: #44a948;
      color: #fff;
      padding: 10px;
      border-radius: 12px;
      box-shadow: 0 10px 26px rgba(0,0,0,.25);
      font-family: Arial, sans-serif;
      width: 220px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    panel.innerHTML = `
      <div id="tm-yp-status" style="
        background:#fff;
        color:#146c2e;
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
      </div>
    `;

    const styleBtn = (btn) => {
      btn.style.cssText = `
        background:#fff;
        color:#146c2e;
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
      const v = 'Publisher_Yen Press';
      setStatus(await copy(v) ? `Copied ${v}` : 'Fail');
    };

    panel.querySelector('#i').onclick = async () => {
      const v = getImprint();
      if (!v) return setStatus('No imprint');
      setStatus(await copy(v) ? `Copied ${v}` : 'Fail');
    };
  }

  build();
  setTimeout(build, 1000);
  setTimeout(build, 2500);
})();
