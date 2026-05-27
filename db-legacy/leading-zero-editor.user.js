// ==UserScript==
// @name         Shopify Leading Zero Bulk Editor - Pad Single-Digit Volume Numbers
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Adds a button to change standard product title volumes from Vol. 1 to Vol. 01 in Shopify bulk editor.
// @match        https://admin.shopify.com/store/*/bulk*
// @run-at       document-idle
// @grant        none
// @updateURL    https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/leading-zero-editor.user.js
// @downloadURL  https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/leading-zero-editor.user.js
// ==/UserScript==

(function () {
  'use strict';

  const BUTTON_ID = 'tbb-pad-volume-button';
  const STATUS_ID = 'tbb-pad-volume-status';

  function setReactInputValue(input, newValue) {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;

    nativeSetter.call(input, newValue);

    input.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertReplacementText',
      data: newValue
    }));

    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function getProductTitleInputs() {
    return Array.from(
      document.querySelectorAll(
        '[role="gridcell"][aria-colindex="1"] input.Polaris-TextField__Input[type="text"]'
      )
    ).filter((input) => {
      const cell = input.closest('[role="gridcell"]');
      return cell && cell.getAttribute('aria-colindex') === '1';
    });
  }

  function padStandardVolumeNumber(title) {
    return title.replace(
      /\bVol\. ([1-9])(?=$|[\s),:\/])/g,
      (_, digit) => `Vol. 0${digit}`
    );
  }

  function showStatus(message, tone = 'success') {
    let status = document.getElementById(STATUS_ID);

    if (!status) {
      status = document.createElement('div');
      status.id = STATUS_ID;
      status.style.cssText = `
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 999999;
        padding: 12px 16px;
        border-radius: 8px;
        font: 600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-shadow: 0 4px 16px rgba(0, 0, 0, .18);
        transition: opacity .2s ease;
      `;
      document.body.appendChild(status);
    }

    status.textContent = message;
    status.style.background = tone === 'success' ? '#007a5c' : '#6d4c00';
    status.style.color = '#ffffff';
    status.style.opacity = '1';

    clearTimeout(status._tbbTimeout);
    status._tbbTimeout = setTimeout(() => {
      status.style.opacity = '0';
    }, 3500);
  }

  function updateVisibleTitles() {
    const inputs = getProductTitleInputs();

    if (!inputs.length) {
      showStatus('No visible product title rows found. Shopify is hiding the goods.', 'warning');
      return;
    }

    let changedCount = 0;
    let untouchedCount = 0;

    inputs.forEach((input) => {
      const originalTitle = input.value;
      const updatedTitle = padStandardVolumeNumber(originalTitle);

      if (updatedTitle !== originalTitle) {
        setReactInputValue(input, updatedTitle);
        changedCount += 1;
      } else {
        untouchedCount += 1;
      }
    });

    if (changedCount > 0) {
      showStatus(
        `Fixed ${changedCount} title${changedCount === 1 ? '' : 's'}. Review, then click Save.`
      );
    } else {
      showStatus(
        `No standard Vol. 1-9 titles found in ${untouchedCount} visible row${untouchedCount === 1 ? '' : 's'}.`,
        'warning'
      );
    }
  }

  function createButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const columnsButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.getAttribute('aria-label') === 'Columns');

    if (!columnsButton) return;

    const buttonGroup = columnsButton.closest('.Polaris-ButtonGroup');
    if (!buttonGroup) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'Polaris-ButtonGroup__Item';

    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = 'Pad Vol. 01';
    button.title = 'Change standard Vol. 1-9 titles to Vol. 01-09';
    button.style.cssText = `
      height: 32px;
      padding: 0 14px;
      margin-right: 8px;
      border: 1px solid #8a6116;
      border-radius: 8px;
      background: #fff4d6;
      color: #5c3a00;
      font: 600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      cursor: pointer;
      white-space: nowrap;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = '#ffe8ad';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = '#fff4d6';
    });

    button.addEventListener('click', updateVisibleTitles);

    wrapper.appendChild(button);
    buttonGroup.insertBefore(wrapper, buttonGroup.lastElementChild);
  }

  const observer = new MutationObserver(() => {
    createButton();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  createButton();
})();
