// ==UserScript==
// @name         Amazon Book Helper - .com full / .co.jp image only
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Floating helper on Amazon product pages. amazon.com: image, synopsis, ISBN-13, contributors. amazon.co.jp: image only.
// @match        https://www.amazon.com/*
// @match        https://www.amazon.co.jp/*
// @run-at       document-idle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  const PANEL_ID = 'tm-amazon-book-helper-panel';
  const STYLE_ID = 'tm-amazon-book-helper-style';
  const REOPEN_ID = 'tm-amazon-book-helper-reopen';

  const HOST = location.hostname;
  const IS_AMAZON_COM = HOST === 'www.amazon.com';
  const IS_AMAZON_JP = HOST === 'www.amazon.co.jp';

  function isProductPage() {
    return /\/(dp|gp\/product)\//.test(location.pathname);
  }

  if (!isProductPage()) return;

  function normalizeWhitespace(text) {
    return (text || '')
      .replace(/\u00A0/g, ' ')
      .replace(/[ \t\f\v]+/g, ' ')
      .trim();
  }

  function cleanImageUrl(url) {
    if (!url) return '';
    const cleaned = url.replace(/\._[^.]+_\./, '.');
    return /^https?:\/\//i.test(cleaned) ? cleaned : url;
  }

  function getMainImageUrl() {
    const candidates = [];

    const imgSelectors = [
      '#landingImage',
      '#imgBlkFront',
      '#ebooksImgBlkFront',
      '#main-image',
      '#imgTagWrapperId img',
      '#mainImageContainer img',
      '#ivLargeImage img',
      'img[data-old-hires]',
      'img[data-a-image-name="landingImage"]'
    ];

    for (const sel of imgSelectors) {
      const el = document.querySelector(sel);
      if (!el) continue;

      const dataOldHiRes = el.getAttribute('data-old-hires');
      const src = el.getAttribute('src');

      if (dataOldHiRes) candidates.push(dataOldHiRes);
      if (src) candidates.push(src);
    }

    document.querySelectorAll('[data-a-dynamic-image]').forEach(node => {
      const raw = node.getAttribute('data-a-dynamic-image');
      if (!raw) return;
      try {
        const obj = JSON.parse(raw);
        candidates.push(...Object.keys(obj || {}));
      } catch (_) {}
    });

    return [...new Set(candidates.map(cleanImageUrl).filter(Boolean))][0] || '';
  }

  function getTitle() {
    const selectors = [
      '#productTitle',
      '#ebooksProductTitle',
      'h1.a-size-large',
      'h1 span'
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const txt = normalizeWhitespace(el.textContent);
      if (txt) return txt;
    }

    return document.title.replace(/\s*:?\s*Amazon.*$/i, '').trim();
  }

  function cleanPlainText(text) {
    return (text || '')
      .replace(/\u00A0/g, ' ')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function cleanSynopsisHtmlPreserveFormatting(html) {
    if (!html) return '';

    const wrap = document.createElement('div');
    wrap.innerHTML = html;

    wrap.querySelectorAll('script, style, button, svg, form, input, .a-expander-header, .a-expander-content-fade').forEach(el => el.remove());

    wrap.querySelectorAll('span.a-text-bold').forEach(el => {
      const strong = document.createElement('strong');
      strong.innerHTML = el.innerHTML;
      el.replaceWith(strong);
    });

    wrap.querySelectorAll('span.a-text-italic').forEach(el => {
      const em = document.createElement('em');
      em.innerHTML = el.innerHTML;
      el.replaceWith(em);
    });

    wrap.querySelectorAll('div').forEach(el => {
      const p = document.createElement('p');
      p.innerHTML = el.innerHTML;
      el.replaceWith(p);
    });

    wrap.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(attr => {
        const name = attr.name.toLowerCase();
        if (name === 'href' || name === 'src') return;
        el.removeAttribute(attr.name);
      });
    });

    let out = wrap.innerHTML
      .replace(/<(span|font)\b[^>]*>/gi, '')
      .replace(/<\/(span|font)>/gi, '')
      .replace(/<p>\s*<\/p>/gi, '')
      .replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br><br>')
      .replace(/\s*\n+\s*/g, '')
      .trim();

    return out;
  }

  function htmlToPlainTextWithBreaks(html) {
    if (!html) return '';

    const wrap = document.createElement('div');
    wrap.innerHTML = html;

    function walk(node) {
      let out = '';

      node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          out += child.textContent || '';
          return;
        }

        if (child.nodeType !== Node.ELEMENT_NODE) return;

        const tag = child.tagName.toLowerCase();

        if (tag === 'br') {
          out += '\n';
          return;
        }

        if (['p', 'div', 'section', 'article', 'li'].includes(tag)) {
          const inner = walk(child).trim();
          if (inner) out += inner + '\n\n';
          return;
        }

        if (tag === 'ul' || tag === 'ol') {
          out += walk(child);
          return;
        }

        out += walk(child);
      });

      return out;
    }

    return cleanPlainText(walk(wrap));
  }

  function getSynopsisData() {
    const exactEl =
      document.querySelector('#bookDescription_feature_div .a-expander-content') ||
      document.querySelector('#bookDescription_feature_div .a-expander-partial-collapse-content') ||
      document.querySelector('#bookDescription_feature_div');

    if (exactEl) {
      const html = cleanSynopsisHtmlPreserveFormatting(exactEl.innerHTML || '');
      const text = htmlToPlainTextWithBreaks(html);
      if (text) return { html, text };
    }

    const fallbackSelectors = [
      '#productDescription',
      '#productDescription_feature_div',
      '#productDescription_expander .a-expander-content',
      '#productDescription_expander',
      '#editorialReviews_feature_div .a-expander-content',
      '#editorialReviews_feature_div',
      '#drengr_MobileTabbedDescriptionOverviewContent_feature_div'
    ];

    for (const sel of fallbackSelectors) {
      const el = document.querySelector(sel);
      if (!el) continue;

      const html = cleanSynopsisHtmlPreserveFormatting(el.innerHTML || '');
      const text = htmlToPlainTextWithBreaks(html);

      if (text && text.length > 40) {
        return { html, text };
      }
    }

    return { html: '', text: '' };
  }

  function getIsbn13() {
    const exactBullets = document.querySelector('#detailBullets_feature_div');
    if (exactBullets) {
      const items = exactBullets.querySelectorAll('li .a-list-item');
      for (const item of items) {
        const bold = item.querySelector('.a-text-bold');
        if (!bold) continue;

        const label = normalizeWhitespace(bold.textContent || '').toLowerCase();
        if (!label.includes('isbn-13')) continue;

        const spans = item.querySelectorAll('span');
        for (const span of spans) {
          const txt = normalizeWhitespace(span.textContent || '');
          const digits = txt.replace(/[^\d]/g, '');
          if (digits.length === 13) return digits;
        }
      }
    }

    const wrapper = document.querySelector('#detailBulletsWrapper_feature_div');
    if (wrapper) {
      const txt = wrapper.innerText || wrapper.textContent || '';
      const match = txt.match(/ISBN-13\s*[:‎]?\s*([0-9-]{13,20})/i);
      if (match && match[1]) {
        const digits = match[1].replace(/[^\d]/g, '');
        if (digits.length === 13) return digits;
      }
    }

    return '';
  }

  function getContributorNames() {
    const names = [];
    const byline = document.querySelector('#bylineInfo');

    if (byline) {
      const authorSpans = byline.querySelectorAll('.author');
      authorSpans.forEach(authorSpan => {
        const link = authorSpan.querySelector('a');
        const name = normalizeWhitespace(link?.textContent || authorSpan.childNodes[0]?.textContent || '');
        if (name) names.push(name);
      });
    }

    if (!names.length) {
      document.querySelectorAll('#bylineInfo a, #bylineInfo_feature_div a, .author a').forEach(a => {
        const txt = normalizeWhitespace(a.textContent || '')
          .replace(/^by\s+/i, '')
          .replace(/\s+Visit Amazon'?s.*$/i, '')
          .trim();

        if (
          txt &&
          !/search results|learn more|format|kindle|paperback|hardcover/i.test(txt)
        ) {
          names.push(txt);
        }
      });
    }

    return [...new Set(names)];
  }

  async function copyPlainText(text) {
    if (!text) return false;

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {}

    try {
      GM_setClipboard(text, 'text');
      return true;
    } catch (_) {}

    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (_) {
      document.body.removeChild(ta);
      return false;
    }
  }

  async function copyRichHtml(html, fallbackText = '') {
    if (!html && !fallbackText) return false;

    if (navigator.clipboard && window.ClipboardItem) {
      try {
        const item = new ClipboardItem({
          'text/html': new Blob([html || ''], { type: 'text/html' }),
          'text/plain': new Blob([fallbackText || htmlToPlainTextWithBreaks(html)], { type: 'text/plain' })
        });
        await navigator.clipboard.write([item]);
        return true;
      } catch (_) {}
    }

    try {
      const temp = document.createElement('div');
      temp.contentEditable = 'true';
      temp.style.position = 'fixed';
      temp.style.left = '-9999px';
      temp.style.top = '0';
      temp.innerHTML = html || '';
      document.body.appendChild(temp);

      const range = document.createRange();
      range.selectNodeContents(temp);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      const ok = document.execCommand('copy');
      sel.removeAllRanges();
      document.body.removeChild(temp);

      if (ok) return true;
    } catch (_) {}

    return copyPlainText(fallbackText || htmlToPlainTextWithBreaks(html));
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        right: 16px;
        bottom: 16px;
        width: 360px;
        background: #fff;
        color: #111;
        border: 1px solid #d5d9d9;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(15,17,17,.18);
        z-index: 999999;
        font-family: Arial, sans-serif;
        font-size: 12px;
      }
      #${REOPEN_ID} {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 999999;
        display: none;
      }
      #${REOPEN_ID} button {
        appearance: none;
        border: 1px solid #d5d9d9;
        background: #fff;
        border-radius: 999px;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 8px 24px rgba(15,17,17,.18);
      }
      #${PANEL_ID} .tm-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        border-bottom: 1px solid #eaeded;
        font-weight: 700;
        gap: 6px;
      }
      #${PANEL_ID} .tm-head-actions {
        display: flex;
        gap: 6px;
      }
      #${PANEL_ID} .tm-head-actions button {
        min-width: 32px;
        padding: 6px 8px;
      }
      #${PANEL_ID} .tm-body {
        padding: 10px 12px;
      }
      #${PANEL_ID} .tm-row {
        margin-bottom: 10px;
      }
      #${PANEL_ID} .tm-label {
        font-size: 11px;
        font-weight: 700;
        margin-bottom: 4px;
        color: #565959;
        text-transform: uppercase;
      }
      #${PANEL_ID} .tm-preview {
        max-height: 92px;
        overflow: auto;
        line-height: 1.4;
        background: #f7fafa;
        border: 1px solid #eaeded;
        border-radius: 8px;
        padding: 8px;
        word-break: break-word;
        white-space: pre-wrap;
      }
      #${PANEL_ID} .tm-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 10px;
      }
      #${PANEL_ID} button {
        appearance: none;
        border: 1px solid #d5d9d9;
        background: #ffd814;
        border-radius: 999px;
        padding: 8px 10px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
      }
      #${PANEL_ID} button.secondary {
        background: #fff;
      }
      #${PANEL_ID} .tm-status {
        margin-top: 8px;
        font-size: 11px;
        color: #565959;
        min-height: 16px;
        white-space: pre-wrap;
      }
      #${PANEL_ID} .tm-mini {
        font-size: 11px;
        color: #565959;
      }
      #${PANEL_ID}.tm-minimized .tm-body {
        display: none;
      }
    `;
    document.head.appendChild(style);
  }

  function buildPacket() {
    const base = {
      title: getTitle(),
      imageUrl: getMainImageUrl()
    };

    if (IS_AMAZON_JP) return base;

    const synopsis = getSynopsisData();
    const authors = getContributorNames();

    return {
      ...base,
      synopsisHtml: synopsis.html,
      synopsisText: synopsis.text,
      authors: authors.join(', '),
      isbn13: getIsbn13()
    };
  }

  function createReopenPill(panel) {
    if (document.getElementById(REOPEN_ID)) return;

    const pill = document.createElement('div');
    pill.id = REOPEN_ID;
    pill.innerHTML = `<button type="button">Open Amazon Helper</button>`;
    document.body.appendChild(pill);

    pill.addEventListener('click', () => {
      panel.style.display = '';
      pill.style.display = 'none';
    });
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) return;

    ensureStyles();

    const panel = document.createElement('div');
    panel.id = PANEL_ID;

    const bodyHtml = IS_AMAZON_JP
      ? `
        <div class="tm-body">
          <div class="tm-row">
            <div class="tm-label">Title</div>
            <div class="tm-preview" data-field="title"></div>
          </div>
          <div class="tm-row">
            <div class="tm-label">Image URL</div>
            <div class="tm-preview" data-field="imageUrl"></div>
          </div>
          <div class="tm-actions">
            <button type="button" data-action="copy-image">Copy Image URL</button>
          </div>
          <div class="tm-status" data-field="status"></div>
          <div class="tm-mini">amazon.co.jp mode: image only.</div>
        </div>
      `
      : `
        <div class="tm-body">
          <div class="tm-row">
            <div class="tm-label">Title</div>
            <div class="tm-preview" data-field="title"></div>
          </div>
          <div class="tm-row">
            <div class="tm-label">Image URL</div>
            <div class="tm-preview" data-field="imageUrl"></div>
          </div>
          <div class="tm-row">
            <div class="tm-label">Synopsis Preview</div>
            <div class="tm-preview" data-field="synopsis"></div>
          </div>
          <div class="tm-row">
            <div class="tm-label">Contributors</div>
            <div class="tm-preview" data-field="authors"></div>
          </div>
          <div class="tm-row">
            <div class="tm-label">ISBN-13</div>
            <div class="tm-preview" data-field="isbn13"></div>
          </div>
          <div class="tm-actions">
            <button type="button" data-action="copy-image">Copy Image URL</button>
            <button type="button" data-action="copy-synopsis-rich">Copy Synopsis</button>
            <button type="button" data-action="copy-authors">Copy Contributors</button>
            <button type="button" data-action="copy-isbn13">Copy ISBN-13</button>
          </div>
          <div class="tm-status" data-field="status"></div>
          <div class="tm-mini">After switching edition/format on the page, press Refresh.</div>
        </div>
      `;

    panel.innerHTML = `
      <div class="tm-head">
        <span>Amazon Book Helper</span>
        <div class="tm-head-actions">
          <button class="secondary" type="button" data-action="refresh">↻</button>
          <button class="secondary" type="button" data-action="minimize">_</button>
          <button class="secondary" type="button" data-action="close">×</button>
        </div>
      </div>
      ${bodyHtml}
    `;

    document.body.appendChild(panel);
    createReopenPill(panel);

    let packet = buildPacket();

    const titleEl = panel.querySelector('[data-field="title"]');
    const imageEl = panel.querySelector('[data-field="imageUrl"]');
    const synopsisEl = panel.querySelector('[data-field="synopsis"]');
    const authorsEl = panel.querySelector('[data-field="authors"]');
    const isbn13El = panel.querySelector('[data-field="isbn13"]');
    const statusEl = panel.querySelector('[data-field="status"]');
    const reopenPill = document.getElementById(REOPEN_ID);

    function render() {
      packet = buildPacket();
      if (titleEl) titleEl.textContent = packet.title || '(not found)';
      if (imageEl) imageEl.textContent = packet.imageUrl || '(not found)';
      if (synopsisEl) synopsisEl.textContent = packet.synopsisText || '(not found)';
      if (authorsEl) authorsEl.textContent = packet.authors || '(not found)';
      if (isbn13El) isbn13El.textContent = packet.isbn13 || '(not found)';
      if (statusEl) statusEl.textContent = '';
    }

    render();

    panel.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;

      if (action === 'refresh') {
        render();
        if (statusEl) statusEl.textContent = 'Refreshed.';
        return;
      }

      if (action === 'minimize') {
        panel.classList.toggle('tm-minimized');
        btn.textContent = panel.classList.contains('tm-minimized') ? '▢' : '_';
        return;
      }

      if (action === 'close') {
        panel.style.display = 'none';
        reopenPill.style.display = 'block';
        return;
      }

      if (action === 'copy-image') {
        const ok = await copyPlainText(packet.imageUrl);
        if (statusEl) statusEl.textContent = ok ? 'Image URL copied.' : 'Could not copy image URL.';
        return;
      }

      if (IS_AMAZON_JP) return;

      if (action === 'copy-synopsis-rich') {
        const ok = await copyRichHtml(packet.synopsisHtml, packet.synopsisText);
        if (statusEl) statusEl.textContent = ok ? 'Synopsis copied.' : 'Could not copy synopsis.';
        return;
      }

      if (action === 'copy-authors') {
        const ok = await copyPlainText(packet.authors);
        if (statusEl) statusEl.textContent = ok ? 'Contributors copied.' : 'Could not copy contributors.';
        return;
      }

      if (action === 'copy-isbn13') {
        const ok = await copyPlainText(packet.isbn13);
        if (statusEl) statusEl.textContent = ok ? 'ISBN-13 copied.' : 'Could not copy ISBN-13.';
      }
    });
  }

  function boot() {
    createPanel();
  }

  const start = () => setTimeout(boot, 1200);

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    start();
  } else {
    window.addEventListener('DOMContentLoaded', start, { once: true });
  }
})();
