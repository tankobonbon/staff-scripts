// ==UserScript==
// @name         Shopify Duplicate Product - Uncheck Boxes + Widen Modal + Remove (Copy) + Title Number Tools + Set Active
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Widens Shopify duplicate modal, unchecks default boxes, removes trailing " (Copy)", auto-increments the last number in the title, adds number controls under the title field, and auto-selects Set as active.
// @match        https://admin.shopify.com/store/tankobonbon-manga-book-store/products/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/duplicate-helper.user.js
// @downloadURL  https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/duplicate-helper.user.js
// ==/UserScript==

(function () {
  'use strict';

  const TARGET_VALUES = new Set([
    'CopyMedia',
    'CopySkus',
    'CopyBarcodes',
    'CopyInventoryQuantities',
    'CopyTranslations',
  ]);

  const ACTIVE_STATUS_VALUE = 'ACTIVE';
  const STYLE_ID = 'tm-shopify-duplicate-modal-width-tools';
  const COPY_SUFFIX_REGEX = /\s\(Copy\)$/;
  const TOOLBAR_ID = 'tm-title-number-toolbar';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .Polaris-Modal-Dialog__Modal {
        max-width: 80rem !important;
        width: 80rem !important;
      }

      #${TOOLBAR_ID} {
        margin-top: 10px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }

      #${TOOLBAR_ID} .tm-group {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
      }

      #${TOOLBAR_ID} button {
        border: 1px solid #c9cccf;
        background: #fff;
        border-radius: 8px;
        padding: 6px 10px;
        cursor: pointer;
        font-size: 13px;
        line-height: 1;
        min-width: 38px;
      }

      #${TOOLBAR_ID} button:hover {
        background: #f6f6f7;
      }

      #${TOOLBAR_ID} input.tm-buffer {
        width: 90px;
        min-height: 32px;
        padding: 6px 8px;
        border: 1px solid #c9cccf;
        border-radius: 8px;
        font-size: 13px;
      }

      #${TOOLBAR_ID} .tm-label {
        font-size: 12px;
        color: #616161;
        margin-right: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  function setNativeValue(element, value) {
    const prototype = Object.getPrototypeOf(element);
    const descriptor =
      Object.getOwnPropertyDescriptor(prototype, 'value') ||
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value') ||
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');

    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
  }

  function dispatchValueEvents(input) {
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  function getDuplicateModal() {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    for (const dialog of dialogs) {
      const title = dialog.querySelector('h2');
      if (title && title.textContent.trim() === 'Duplicate product') {
        return dialog;
      }
    }
    return null;
  }

  function getTitleFieldHost(modal) {
    if (!modal) return null;
    return modal.querySelector('s-internal-text-field[name="newTitle"]');
  }

  function getTitleInput(modal) {
    const host = getTitleFieldHost(modal);
    if (!host) return null;

    return (
      host.shadowRoot?.querySelector('input, textarea') ||
      host.querySelector('input, textarea')
    );
  }

  function uncheckTargetBoxes(modal) {
    if (!modal) return;

    const checkboxes = modal.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach((checkbox) => {
      if (!TARGET_VALUES.has(checkbox.value)) return;

      if (checkbox.checked) {
        checkbox.click();
        console.log('[Tampermonkey] Unchecked:', checkbox.value);
      }
    });
  }

  function selectActiveStatus(modal) {
    if (!modal) return false;

    const activeRadio = modal.querySelector(
      `input[type="radio"][value="${ACTIVE_STATUS_VALUE}"]`
    );

    if (!activeRadio) return false;
    if (activeRadio.checked) return false;

    activeRadio.click();
    console.log('[Tampermonkey] Selected product status: ACTIVE');
    return true;
  }

  function removeCopySuffix(input) {
    if (!input) return false;

    const currentValue = input.value;
    if (!COPY_SUFFIX_REGEX.test(currentValue)) return false;

    const newValue = currentValue.replace(COPY_SUFFIX_REGEX, '');
    if (newValue === currentValue) return false;

    setNativeValue(input, newValue);
    dispatchValueEvents(input);
    console.log('[Tampermonkey] Removed trailing " (Copy)" from title');
    return true;
  }

  function findTargetNumberInfo(text, caretPos = null) {
    const matches = [...text.matchAll(/\d+/g)];
    if (!matches.length) return null;

    if (typeof caretPos === 'number') {
      for (const match of matches) {
        const start = match.index;
        const end = start + match[0].length;
        if (caretPos >= start && caretPos <= end) {
          return {
            start,
            end,
            value: match[0],
          };
        }
      }

      for (const match of matches) {
        const start = match.index;
        const end = start + match[0].length;
        if (caretPos === start - 1 || caretPos === end + 1) {
          return {
            start,
            end,
            value: match[0],
          };
        }
      }
    }

    const last = matches[matches.length - 1];
    return {
      start: last.index,
      end: last.index + last[0].length,
      value: last[0],
    };
  }

  function replaceRange(text, start, end, replacement) {
    return text.slice(0, start) + replacement + text.slice(end);
  }

  function incrementTargetNumber(input, delta) {
    if (!input) return false;

    const text = input.value;
    const caretPos = typeof input.selectionStart === 'number' ? input.selectionStart : null;
    const info = findTargetNumberInfo(text, caretPos);
    if (!info) return false;

    const original = info.value;
    const originalNum = parseInt(original, 10);
    if (Number.isNaN(originalNum)) return false;

    const nextNum = Math.max(0, originalNum + delta);
    let replacement = String(nextNum);

    if (original.length > 1 && original.startsWith('0')) {
      replacement = replacement.padStart(original.length, '0');
    }

    const newText = replaceRange(text, info.start, info.end, replacement);
    if (newText === text) return false;

    setNativeValue(input, newText);
    dispatchValueEvents(input);

    const newCaret = info.start + replacement.length;
    try {
      input.focus();
      input.setSelectionRange(newCaret, newCaret);
    } catch {}

    return true;
  }

  function applyCustomNumber(input, customNumber) {
    if (!input) return false;
    if (!/^\d+$/.test(customNumber)) return false;

    const text = input.value;
    const caretPos = typeof input.selectionStart === 'number' ? input.selectionStart : null;
    const info = findTargetNumberInfo(text, caretPos);
    if (!info) return false;

    let replacement = customNumber;

    if (info.value.length > 1 && info.value.startsWith('0')) {
      replacement = replacement.padStart(info.value.length, '0');
    }

    const newText = replaceRange(text, info.start, info.end, replacement);
    if (newText === text) return false;

    setNativeValue(input, newText);
    dispatchValueEvents(input);

    const newCaret = info.start + replacement.length;
    try {
      input.focus();
      input.setSelectionRange(newCaret, newCaret);
    } catch {}

    return true;
  }

  function autoIncrementOnce(modal, input) {
    if (!modal || !input) return;
    if (modal.dataset.tmAutoIncrementDone === '1') return;

    const changed = incrementTargetNumber(input, 1);
    modal.dataset.tmAutoIncrementDone = '1';

    if (changed) {
      console.log('[Tampermonkey] Auto-incremented last number in title');
    }
  }

  function createButton(label, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function injectToolbar(modal, input) {
    if (!modal || !input) return;

    const host = getTitleFieldHost(modal);
    if (!host) return;

    const existing = modal.querySelector(`#${TOOLBAR_ID}`);
    if (existing) return;

    const toolbar = document.createElement('div');
    toolbar.id = TOOLBAR_ID;

    const adjustGroup = document.createElement('div');
    adjustGroup.className = 'tm-group';

    const entryGroup = document.createElement('div');
    entryGroup.className = 'tm-group';

    const label = document.createElement('span');
    label.className = 'tm-label';
    label.textContent = 'Set number:';

    const buffer = document.createElement('input');
    buffer.type = 'text';
    buffer.className = 'tm-buffer';
    buffer.inputMode = 'numeric';
    buffer.placeholder = 'number';

    adjustGroup.appendChild(createButton('-1', () => {
      incrementTargetNumber(input, -1);
    }));

    adjustGroup.appendChild(createButton('+1', () => {
      incrementTargetNumber(input, 1);
    }));

    entryGroup.appendChild(label);
    entryGroup.appendChild(buffer);

    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].forEach((digit) => {
      entryGroup.appendChild(createButton(digit, () => {
        buffer.value += digit;
        buffer.focus();
      }));
    });

    entryGroup.appendChild(createButton('⌫', () => {
      buffer.value = buffer.value.slice(0, -1);
      buffer.focus();
    }));

    entryGroup.appendChild(createButton('Clear', () => {
      buffer.value = '';
      buffer.focus();
    }));

    entryGroup.appendChild(createButton('Apply', () => {
      if (!buffer.value) return;
      const applied = applyCustomNumber(input, buffer.value);
      if (applied) {
        buffer.value = '';
      }
    }));

    toolbar.appendChild(adjustGroup);
    toolbar.appendChild(entryGroup);

    host.insertAdjacentElement('afterend', toolbar);
  }

  function resetModalStateWhenClosed() {
    const modal = getDuplicateModal();
    if (modal) return;

    document.querySelectorAll(`#${TOOLBAR_ID}`).forEach((el) => el.remove());
  }

  function runEnhancements() {
    injectStyles();

    const modal = getDuplicateModal();
    if (!modal) {
      resetModalStateWhenClosed();
      return;
    }

    const input = getTitleInput(modal);
    if (!input) return;

    uncheckTargetBoxes(modal);
    selectActiveStatus(modal);
    removeCopySuffix(input);
    autoIncrementOnce(modal, input);
    injectToolbar(modal, input);
  }

  runEnhancements();

  const observer = new MutationObserver(() => {
    runEnhancements();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
