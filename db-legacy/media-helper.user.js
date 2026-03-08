// ==UserScript==
// @name         Shopify Media - Auto Open Add from URL
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auto-opens Shopify's Add media from URL when Select existing is used, with a best-effort Add via URL shortcut.
// @match        https://admin.shopify.com/store/tankobonbon-manga-book-store/products/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/media-helper.user.js
// @downloadURL  https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/media-helper.user.js
// ==/UserScript==

(function () {
  'use strict';

  const STYLE_ID = 'tm-shopify-media-url-auto-style';
  const BTN_ID = 'tm-shopify-add-via-url-btn';

  let modalWatchTimer = null;
  let modalWatchDeadline = 0;
  let pendingAutoOpen = false;

  function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    );
  }

  function fireMouseSequence(el) {
    if (!el) return;

    const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
    for (const type of events) {
      el.dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window,
        })
      );
    }

    if (typeof el.click === 'function') {
      el.click();
    }
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BTN_ID} {
        display: inline-flex !important;
        margin-left: 0.45rem !important;
      }

      #${BTN_ID} button {
        cursor: pointer !important;
      }

      .tm-shopify-url-popover .Polaris-Popover__Content {
        min-width: 32rem !important;
        width: 32rem !important;
        height: auto !important;
      }

      .tm-shopify-url-popover .Polaris-Popover__Section {
        padding: 0.9rem 1rem !important;
      }

      .tm-shopify-url-popover .Polaris-TextField {
        min-width: 24rem !important;
      }
    `;
    document.head.appendChild(style);
  }

  function getSelectExistingElement() {
    const candidates = Array.from(document.querySelectorAll('s-internal-link, button, a, span, div'));
    return candidates.find((el) => normalizeText(el.textContent) === 'Select existing' && isVisible(el)) || null;
  }

  function getMediaActionsContainer() {
    const selectExisting = getSelectExistingElement();
    if (!selectExisting) return null;
    return selectExisting.parentElement?.parentElement || selectExisting.parentElement || null;
  }

  function injectHelperButton() {
    if (document.getElementById(BTN_ID)) return;

    const container = getMediaActionsContainer();
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.id = BTN_ID;
    wrapper.innerHTML = `
      <button class="Polaris-Button Polaris-Button--pressable Polaris-Button--variantSecondary Polaris-Button--sizeMicro Polaris-Button--textAlignCenter" type="button">
        <span class="Polaris-Text--root Polaris-Text--bodySm Polaris-Text--medium">Add via URL</span>
      </button>
    `;

    wrapper.querySelector('button')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      pendingAutoOpen = true;
      startWatchingForModal();

      const selectExisting = getSelectExistingElement();
      if (selectExisting) {
        tryOpenSelectExisting(selectExisting);
      }
    });

    container.appendChild(wrapper);
  }

  function getVisibleSelectFileModal() {
    const dialogs = Array.from(document.querySelectorAll('.Polaris-Modal-Dialog'));
    return dialogs.find((dialog) => {
      if (!isVisible(dialog)) return false;
      const heading = dialog.querySelector('h2');
      return heading && normalizeText(heading.textContent) === 'Select file';
    }) || null;
  }

  function getUrlToggle(modal) {
    if (!modal) return null;

    return Array.from(modal.querySelectorAll('button[aria-label="Add from URL"]')).find(isVisible) || null;
  }

  function getUrlInput() {
    return Array.from(document.querySelectorAll('.Polaris-Popover input[type="url"]')).find(isVisible) || null;
  }

  function markPopover() {
    const input = getUrlInput();
    const popover = input?.closest('.Polaris-Popover');
    if (popover) popover.classList.add('tm-shopify-url-popover');
  }

  function focusUrlInput() {
    const input = getUrlInput();
    if (!input) return false;

    markPopover();
    input.focus();
    input.select?.();
    return true;
  }

  function openUrlInsideModal() {
    const modal = getVisibleSelectFileModal();
    if (!modal) return false;

    if (focusUrlInput()) {
      modal.dataset.tmUrlAlreadyOpened = '1';
      return true;
    }

    const toggle = getUrlToggle(modal);
    if (!toggle) return false;

    if (modal.dataset.tmUrlAlreadyOpened !== '1') {
      fireMouseSequence(toggle);
      modal.dataset.tmUrlAlreadyOpened = '1';
      return false;
    }

    return false;
  }

  function stopWatchingForModal() {
    if (modalWatchTimer) {
      clearInterval(modalWatchTimer);
      modalWatchTimer = null;
    }
  }

  function startWatchingForModal() {
    stopWatchingForModal();

    modalWatchDeadline = Date.now() + 8000;

    modalWatchTimer = setInterval(() => {
      if (Date.now() > modalWatchDeadline) {
        stopWatchingForModal();
        pendingAutoOpen = false;
        return;
      }

      const modal = getVisibleSelectFileModal();
      if (!modal) return;

      if (focusUrlInput()) {
        modal.dataset.tmUrlAlreadyOpened = '1';
        stopWatchingForModal();
        pendingAutoOpen = false;
        return;
      }

      openUrlInsideModal();

      setTimeout(() => {
        if (focusUrlInput()) {
          const visibleModal = getVisibleSelectFileModal();
          if (visibleModal) visibleModal.dataset.tmUrlAlreadyOpened = '1';
          stopWatchingForModal();
          pendingAutoOpen = false;
        }
      }, 180);
    }, 180);
  }

  function tryOpenSelectExisting(el) {
    const attempts = [
      el,
      el.closest('button'),
      el.closest('a'),
      el.closest('[role="button"]'),
      el.parentElement,
      el.parentElement?.parentElement,
    ].filter(Boolean);

    for (const target of attempts) {
      fireMouseSequence(target);
    }
  }

  function handlePossibleSelectExistingClick(event) {
    const path = event.composedPath ? event.composedPath() : [];
    const hit = path.find((node) => {
      return node instanceof Element && normalizeText(node.textContent) === 'Select existing';
    });

    if (!hit) return;

    pendingAutoOpen = true;

    setTimeout(() => {
      startWatchingForModal();
    }, 60);
  }

  function watchDom() {
    const observer = new MutationObserver(() => {
      injectHelperButton();

      if (!pendingAutoOpen) return;

      const modal = getVisibleSelectFileModal();
      if (!modal) return;

      if (!modal.dataset.tmUrlAlreadyOpened) {
        startWatchingForModal();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function init() {
    addStyles();
    injectHelperButton();
    watchDom();

    document.addEventListener('click', handlePossibleSelectExistingClick, true);
  }

  init();
})();
