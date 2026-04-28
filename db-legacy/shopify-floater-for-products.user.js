// ==UserScript==
// @name         Shopify Floater for Products
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds floating Amazon and Amazon JP buttons on Shopify product pages when the product has the Cover not final tag.
// @match        https://admin.shopify.com/store/*/products/*
// @run-at       document-idle
// @updateURL    https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/shopify-floater-for-products.user.js
// @downloadURL  https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/shopify-floater-for-products.user.js
// ==/UserScript==

(function () {
  'use strict';

  const BUTTON_WRAP_ID = 'tbb-open-amazon-wrap';
  const AMAZON_BTN_ID = 'tbb-open-amazon-floating';
  const AMAZON_JP_BTN_ID = 'tbb-open-amazon-jp-floating';

  function normalize(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function hasCoverNotFinal() {
    return [...document.querySelectorAll('a, button, span, div, s-internal-text')]
      .some(el => normalize(el.textContent).toLowerCase() === 'cover not final');
  }

  function findSku() {
    const input = [...document.querySelectorAll('input')]
      .find(i => {
        const bag = [
          i.name || '',
          i.id || '',
          i.getAttribute('aria-label') || '',
          i.getAttribute('placeholder') || ''
        ].join(' ').toLowerCase();

        return bag.includes('sku');
      });

    const value = input ? normalize(input.value) : '';
    return /^\d{10}(\d{3})?$/.test(value) ? value : '';
  }

  function findJapaneseTitle() {
    const exactAnchor = document.querySelector('#PRODUCT\\.metafields\\.arena\\.japanese-anchor');
    if (exactAnchor) {
      const valueNode = exactAnchor.querySelector('._ReadField_123bh_9, ._ReadWrapper_123bh_1, [class*="ReadField"], [class*="ReadWrapper"]');
      const text = normalize(valueNode?.textContent || '');
      if (text) return text;
    }

    const candidates = [...document.querySelectorAll('[id*="PRODUCT.metafields.arena.japanese"], [aria-label*="Japanese/Original title"], label, p, div, span')];

    for (const el of candidates) {
      const text = normalize(el.textContent);
      if (text === 'Japanese/Original title') {
        const wrapper =
          el.closest('[id*="PRODUCT.metafields.arena.japanese"]') ||
          el.closest('div[role="button"]') ||
          el.parentElement?.parentElement?.parentElement;

        const value = normalize(wrapper?.textContent || '')
          .replace(/^Japanese\/Original title/i, '')
          .trim();

        if (value && value !== '—') return value;
      }
    }

    const pageText = normalize(document.body.innerText || '');
    const match = pageText.match(/Japanese\/Original title\s+([^\n]+)/i);
    if (match && match[1]) {
      return normalize(match[1]);
    }

    return '';
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

    btn.onmouseenter = () => btn.style.opacity = '0.85';
    btn.onmouseleave = () => btn.style.opacity = '1';

    return btn;
  }

  function createAmazonButton() {
    const btn = makeBaseButton(AMAZON_BTN_ID, 'Open in Amazon', '#FF9900', '#111');

    btn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();

      const sku = findSku();
      if (!sku) {
        alert('No SKU / ISBN found.');
        return;
      }

      window.open(`https://www.amazon.com/s?k=${encodeURIComponent(sku)}`, '_blank', 'noopener');
    };

    return btn;
  }

  function createAmazonJpButton() {
    const btn = makeBaseButton(AMAZON_JP_BTN_ID, 'Open in Amazon JP', '#F3F4F6', '#111');

    btn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();

      const jpTitle = findJapaneseTitle();
      if (!jpTitle) {
        alert('No Japanese/Original title found.');
        return;
      }

      window.open(`https://www.amazon.co.jp/s?k=${encodeURIComponent(jpTitle)}&i=stripbooks`, '_blank', 'noopener');
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
    wrap.style.width = '160px';

    wrap.appendChild(createAmazonButton());
    wrap.appendChild(createAmazonJpButton());

    return wrap;
  }

  function inject() {
    const existing = document.getElementById(BUTTON_WRAP_ID);
    if (existing) {
      if (!hasCoverNotFinal()) {
        existing.remove();
      }
      return;
    }

    if (!hasCoverNotFinal()) return;

    document.body.appendChild(createWrap());
  }

  function boot() {
    const observer = new MutationObserver(() => {
      inject();
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
