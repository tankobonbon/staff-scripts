// ==UserScript==
// @name         Shopify Media - Auto Open Add from URL
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Auto-opens Shopify's Add media from URL when Select existing is used, with a best-effort Add via URL shortcut.
// @match        https://admin.shopify.com/store/tankobonbon-manga-book-store/products/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/media-helper.user.js
// @downloadURL  https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/media-helper.user.js
// ==/UserScript==

(function () {
  'use strict';

  const STYLE_ID = 'tm-shopify-media-url-style';
  const RING_CLASS = 'tm-add-url-ring';

  let timer = null;
  let tries = 0;
  let armed = false;

  function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    );
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .tm-hide-upload-new {
        display: none !important;
      }

      .tm-select-existing-tight {
        width: auto !important;
        display: inline-flex !important;
        align-items: center !important;
      }

      .tm-select-existing-tight * {
        pointer-events: auto !important;
      }

      .${RING_CLASS} {
        outline: 3px solid #ff8c00 !important;
        outline-offset: 2px !important;
        border-radius: 6px !important;
      }
    `;
    document.head.appendChild(style);
  }

  function clearRing() {
    document.querySelectorAll('.' + RING_CLASS).forEach(el => el.classList.remove(RING_CLASS));
  }

  function getUploadNewElement() {
    const candidates = Array.from(document.querySelectorAll('s-internal-button, button, a, span, div'));
    return candidates.find((el) => normalizeText(el.textContent) === 'Upload new' && isVisible(el)) || null;
  }

  function getSelectExistingElement() {
    const candidates = Array.from(document.querySelectorAll('s-internal-link, button, a, span, div'));
    return candidates.find((el) => normalizeText(el.textContent) === 'Select existing' && isVisible(el)) || null;
  }

  function tightenActions() {
    const upload = getUploadNewElement();
    const select = getSelectExistingElement();

    if (upload) {
      const uploadWrap =
        upload.closest('._Link_1oych_34') ||
        upload.parentElement ||
        upload;
      uploadWrap.classList.add('tm-hide-upload-new');
    }

    if (select) {
      const selectWrap =
        select.closest('._Link_1oych_34') ||
        select.parentElement ||
        select;
      selectWrap.classList.add('tm-select-existing-tight');
    }
  }

  function getSelectFileModal() {
    return [...document.querySelectorAll('.Polaris-Modal-Dialog')].find(dialog => {
      if (!isVisible(dialog)) return false;
      const h2 = dialog.querySelector('h2');
      return h2 && normalizeText(h2.textContent) === 'Select file';
    }) || null;
  }

  function getActivator(modal) {
    if (!modal) return null;

    return [...modal.querySelectorAll('div[aria-haspopup="dialog"]')].find(div => {
      if (!isVisible(div)) return false;
      return !!div.querySelector('s-internal-button[accessibilitylabel="Add from URL"]');
    }) || null;
  }

  function getInnerChevron(modal) {
    const activator = getActivator(modal);
    return activator?.querySelector('s-internal-button[accessibilitylabel="Add from URL"]') || null;
  }

  function getUrlInput() {
    return [...document.querySelectorAll('.Polaris-Popover input[type="url"], input[type="url"][placeholder="https://"]')]
      .find(isVisible) || null;
  }

  function focusUrlInput() {
    const input = getUrlInput();
    if (!input) return false;
    input.focus();
    input.select?.();
    return true;
  }

  function tryOpen() {
    const modal = getSelectFileModal();
    if (!modal) return false;

    if (focusUrlInput()) return true;

    const activator = getActivator(modal);
    const inner = getInnerChevron(modal);
    if (!activator) return false;

    clearRing();
    activator.classList.add(RING_CLASS);

    try { activator.focus({ preventScroll: true }); } catch {}
    try { activator.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch {}
    try { activator.click(); } catch {}
    try { inner?.click(); } catch {}

    return false;
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    tries = 0;
    armed = false;
  }

  function start() {
    stop();
    armed = true;
    tries = 0;

    timer = setInterval(() => {
      tries += 1;

      if (tryOpen()) {
        stop();
        return;
      }

      if (tries >= 15) {
        stop();
      }
    }, 180);
  }

  function handleSelectExistingClick(event) {
    const path = event.composedPath ? event.composedPath() : [];
    const hit = path.find(node =>
      node instanceof Element &&
      normalizeText(node.textContent) === 'Select existing'
    );

    if (!hit) return;

    setTimeout(() => start(), 250);
  }

  function initObserver() {
    new MutationObserver(() => {
      tightenActions();
      if (armed) tryOpen();
    }).observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    addStyles();
    tightenActions();
    initObserver();
    document.addEventListener('click', handleSelectExistingClick, true);
  }

  init();
})();
