// ==UserScript==
// @name         Airtable Interface - DB Work Panel
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Helper panel with copy buttons and smart tab opener for database workflow.
// @match        https://airtable.com/appkGoa9PDJzEj1jp/*
// @run-at       document-idle
// @grant        GM_setClipboard
// @updateURL    https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-airtable/new-volume-helper.user.js
// @downloadURL  https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-airtable/new-volume-helper.user.js
// ==/UserScript==

(function () {
  'use strict';

  if (window.location.pathname !== '/appkGoa9PDJzEj1jp/shrGU6mci51Ar2G0G') return;

  const PANEL_ID = 'tbb-db-panel';

  function normalize(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function getRoot() {
    return [...document.querySelectorAll('[data-testid="page-element:recordContainer"]')]
      .find(el => el.getBoundingClientRect().left > window.innerWidth * 0.6);
  }

  function getTitle(root) {
    const el = root.querySelector('.heading-size-xxlarge');
    return el ? normalize(el.textContent) : '';
  }

  function getFieldBlock(root, label) {
    const labels = [...root.querySelectorAll('[data-testid="page-element-label"]')];
    for (const l of labels) {
      if (normalize(l.textContent).toLowerCase() === label.toLowerCase()) {
        return l.closest('[data-testid="sideBySideLabel"], [data-testid="stackedLabel"]');
      }
    }
    return null;
  }

  function getText(root, label) {
    const block = getFieldBlock(root, label);
    if (!block) return '';

    const cellEditor = block.querySelector('[data-testid="cell-editor"]');
    if (!cellEditor) return '';

    const dateEl = cellEditor.querySelector('.date');
    if (dateEl) return normalize(dateEl.textContent);

    const choiceToken = cellEditor.querySelector('.choiceToken, .cellToken, [title]');
    if (choiceToken) {
      const titled = choiceToken.getAttribute('title');
      if (titled && normalize(titled)) return normalize(titled);
    }

    const valueEls = [...cellEditor.querySelectorAll('.text-color-default')]
      .filter(el => !el.closest('[data-testid="page-element-label"]'))
      .filter(el => !el.classList.contains('visually-hidden'))
      .map(el => normalize(el.textContent))
      .filter(Boolean)
      .filter(text => text.toLowerCase() !== label.toLowerCase())
      .filter(text => !/^format:\s*/i.test(text));

    return valueEls[0] || '';
  }

  function getLink(root, label) {
    const block = getFieldBlock(root, label);
    if (!block) return '';

    const link = block.querySelector('a[data-button-field-button="true"][href]');
    return link ? link.href : '';
  }

  function isBlank(v) {
    const value = normalize(v);
    return !value || value === '-' || value === '–';
  }

  function copy(text) {
    navigator.clipboard.writeText(text);
  }

  function inject(root) {
    if (!root || document.getElementById(PANEL_ID)) return;

    const title = root.querySelector('.heading-size-xxlarge');
    if (!title) return;

    const row = title.closest('[data-testid="page-element:cellEditor"]');
    if (!row) return;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.gap = '8px';
    panel.style.padding = '12px';
    panel.style.marginBottom = '10px';
    panel.style.border = '1px solid #86efac';
    panel.style.borderRadius = '12px';
    panel.style.background = '#f0fdf4';

    const buttonRow = document.createElement('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.gap = '8px';
    buttonRow.style.flexWrap = 'wrap';

    const tooltip = document.createElement('div');
    tooltip.textContent = 'Waiting for something to be copied...';
    tooltip.style.fontStyle = 'italic';
    tooltip.style.opacity = '0.6';
    tooltip.style.fontSize = '12px';
    tooltip.style.color = '#166534';
    tooltip.style.minHeight = '16px';

    const getData = () => ({
      title: getTitle(root),
      isbn: getText(root, 'ISBN'),
      date: getText(root, 'Shopify-friendly date'),
      publisherImprint: getText(root, 'Publisher/Imprint'),
      amazon: getLink(root, 'Amazon link'),
      amazonJP: getLink(root, 'Amazon JP Search'),
      mangaUpdates: getLink(root, 'MangaUpdates'),
      publisher: getLink(root, 'Publisher Page Search'),
      shopify: getLink(root, 'Go to Shopify'),
      prevVol: getText(root, 'Previous Volume Number')
    });

    function createBtn(label, handler, isPrimary) {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.padding = '6px 10px';
      btn.style.fontSize = '12px';
      btn.style.borderRadius = '8px';
      btn.style.border = '1px solid #86efac';
      btn.style.cursor = 'pointer';
      btn.style.transition = 'all .15s ease';
      btn.style.background = isPrimary ? '#16a34a' : '#dcfce7';
      btn.style.color = isPrimary ? '#fff' : '#166534';
      btn.onmouseenter = () => { btn.style.opacity = '0.85'; };
      btn.onmouseleave = () => { btn.style.opacity = '1'; };
      btn.onclick = e => {
        e.stopPropagation();
        handler();
      };
      return btn;
    }

    buttonRow.appendChild(createBtn('Copy title', () => {
      const v = getData().title;
      if (!v) return;
      copy(v);
      tooltip.textContent = `Copied ${v}`;
      tooltip.style.fontStyle = 'normal';
      tooltip.style.opacity = '1';
    }, false));

    buttonRow.appendChild(createBtn('Copy ISBN', () => {
      const v = getData().isbn;
      if (!v) return;
      copy(v);
      tooltip.textContent = `Copied ${v}`;
      tooltip.style.fontStyle = 'normal';
      tooltip.style.opacity = '1';
    }, false));

    buttonRow.appendChild(createBtn('Copy date', () => {
      const v = getData().date;
      if (!v) return;
      copy(v);
      tooltip.textContent = `Copied ${v}`;
      tooltip.style.fontStyle = 'normal';
      tooltip.style.opacity = '1';
    }, false));

    buttonRow.appendChild(createBtn('Copy Publisher/Imprint', () => {
      const v = getData().publisherImprint;
      if (!v) return;
      copy(v);
      tooltip.textContent = `Copied ${v}`;
      tooltip.style.fontStyle = 'normal';
      tooltip.style.opacity = '1';
    }, false));

    buttonRow.appendChild(createBtn('Ctrl + Open tabs', () => {
      const d = getData();
      const urls = [];

      if (d.amazon) urls.push(d.amazon);

      if (isBlank(d.prevVol)) {
        if (d.mangaUpdates) urls.push(d.mangaUpdates);
        if (d.publisher) urls.push(d.publisher);
      } else {
        if (d.amazonJP) urls.push(d.amazonJP);
      }

      if (d.shopify) urls.push(d.shopify);

      urls.forEach(u => window.open(u, '_blank'));
      tooltip.textContent = `Opened ${urls.length} tab(s)`;
      tooltip.style.fontStyle = 'normal';
      tooltip.style.opacity = '1';
    }, true));

    panel.appendChild(buttonRow);
    panel.appendChild(tooltip);

    row.parentElement.insertBefore(panel, row);
  }

  function boot() {
    const obs = new MutationObserver(() => {
      const root = getRoot();
      if (root) inject(root);
    });

    obs.observe(document.body, { childList: true, subtree: true });

    const root = getRoot();
    if (root) inject(root);
  }

  boot();
})();
