// ==UserScript==
// @name         Shopify Duplicate Product - Uncheck Boxes + Widen Modal + Remove (Copy) + Title Number Tools + Set Active
// @namespace    http://tampermonkey.net/
// @version      1.1
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

  const TARGET_VALUES_ARRAY = [...TARGET_VALUES];
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

  function dispatchValueEvents(element) {
    element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  function dispatchChoiceEvents(element) {
    element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    element.dispatchEvent(new Event('click', { bubbles: true, composed: true }));
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

  function getChoiceLists(modal) {
    return [...modal.querySelectorAll('s-choice-list')];
  }

  function getDuplicateChoiceList(modal) {
    return getChoiceLists(modal).find((list) =>
      (list.getAttribute('label') || '').includes('Duplicate the selected product details')
    );
  }

  function getStatusChoiceList(modal) {
    return getChoiceLists(modal).find((list) =>
      (list.getAttribute('label') || '').includes('Product status')
    );
  }

  function getChoiceValue(choice) {
    return choice?.getAttribute('value') || choice?.value || '';
  }

  function clickDeep(element) {
    if (!element) return false;

    const candidates = [
      element.shadowRoot?.querySelector('button'),
      element.shadowRoot?.querySelector('input'),
      element.shadowRoot?.querySelector('[role="radio"]'),
      element.shadowRoot?.querySelector('[role="checkbox"]'),
      element.querySelector('button'),
      element.querySelector('input'),
      element.querySelector('[role="radio"]'),
      element.querySelector('[role="checkbox"]'),
      element,
    ].filter(Boolean);

    for (const candidate of candidates) {
      try {
        candidate.click();
        return true;
      } catch {}
    }

    return false;
  }

  function getListSelectedValues(list) {
    if (!list) return [];

    const rawCandidates = [
      list.value,
      list.values,
      list.selected,
      list.selectedValues,
      list.modelValue,
    ];

    for (const raw of rawCandidates) {
      if (Array.isArray(raw)) {
        return raw.map(String);
      }
      if (typeof raw === 'string' && raw) {
        return [raw];
      }
      if (raw && typeof raw === 'object') {
        try {
          if (Array.isArray(raw.value)) return raw.value.map(String);
        } catch {}
      }
    }

    const attrCandidates = [
      list.getAttribute('value'),
      list.getAttribute('values'),
      list.getAttribute('selected'),
      list.getAttribute('selected-values'),
    ];

    for (const raw of attrCandidates) {
      if (!raw) continue;
      if (raw.includes(',')) {
        return raw.split(',').map((v) => v.trim()).filter(Boolean);
      }
      return [raw];
    }

    const selectedChoices = [...list.querySelectorAll('s-choice')].filter((choice) => {
      const sr = choice.shadowRoot;
      return (
        choice.hasAttribute('selected') ||
        choice.hasAttribute('checked') ||
        choice.getAttribute('aria-checked') === 'true' ||
        choice.getAttribute('aria-selected') === 'true' ||
        sr?.querySelector('[aria-checked="true"]') ||
        sr?.querySelector('[aria-selected="true"]') ||
        sr?.querySelector('input:checked')
      );
    });

    return selectedChoices.map(getChoiceValue).filter(Boolean);
  }

  function setListValue(list, value) {
    if (!list) return false;

    let success = false;

    const trySet = (prop, val) => {
      try {
        list[prop] = val;
        success = true;
      } catch {}
    };

    trySet('value', value);
    trySet('values', Array.isArray(value) ? value : [value]);
    trySet('selected', value);
    trySet('selectedValues', Array.isArray(value) ? value : [value]);
    trySet('modelValue', value);

    try {
      if (Array.isArray(value)) {
        list.setAttribute('values', value.join(','));
        list.setAttribute('selected-values', value.join(','));
      } else {
        list.setAttribute('value', String(value));
        list.setAttribute('selected', String(value));
      }
      success = true;
    } catch {}

    dispatchChoiceEvents(list);
    return success;
  }

  function setChoiceSelected(choice, selected) {
    if (!choice) return false;

    let success = false;

    const props = ['checked', 'selected', 'value', 'pressed', 'active'];

    for (const prop of props) {
      try {
        if (prop === 'value') continue;
        choice[prop] = selected;
        success = true;
      } catch {}
    }

    try {
      if (selected) {
        choice.setAttribute('selected', '');
        choice.setAttribute('checked', '');
        choice.setAttribute('aria-checked', 'true');
        choice.setAttribute('aria-selected', 'true');
      } else {
        choice.removeAttribute('selected');
        choice.removeAttribute('checked');
        choice.setAttribute('aria-checked', 'false');
        choice.setAttribute('aria-selected', 'false');
      }
      success = true;
    } catch {}

    try {
      const sr = choice.shadowRoot;
      const innerInput = sr?.querySelector('input');
      if (innerInput) {
        innerInput.checked = selected;
        dispatchChoiceEvents(innerInput);
        success = true;
      }
    } catch {}

    dispatchChoiceEvents(choice);
    return success;
  }

  function uncheckTargetBoxes(modal) {
    if (!modal) return false;

    const list = getDuplicateChoiceList(modal);
    if (!list) return false;

    let changed = false;

    try {
      const selectedValues = getListSelectedValues(list);
      const filteredValues = selectedValues.filter((value) => !TARGET_VALUES.has(value));

      if (
        selectedValues.length &&
        filteredValues.length !== selectedValues.length
      ) {
        setListValue(list, filteredValues);
        changed = true;
      }
    } catch {}

    const choices = [...list.querySelectorAll('s-choice')];
    for (const choice of choices) {
      const value = getChoiceValue(choice);
      if (!TARGET_VALUES.has(value)) continue;

      setChoiceSelected(choice, false);
      clickDeep(choice);
      setChoiceSelected(choice, false);
      changed = true;
    }

    dispatchChoiceEvents(list);
    return changed;
  }

  function selectActiveStatus(modal) {
    if (!modal) return false;

    const list = getStatusChoiceList(modal);
    if (!list) return false;

    let changed = false;

    setListValue(list, ACTIVE_STATUS_VALUE);

    const choices = [...list.querySelectorAll('s-choice')];
    for (const choice of choices) {
      const value = getChoiceValue(choice);
      if (!value) continue;

      const shouldSelect = value === ACTIVE_STATUS_VALUE;
      setChoiceSelected(choice, shouldSelect);

      if (shouldSelect) {
        clickDeep(choice);
        setChoiceSelected(choice, true);
        changed = true;
      }
    }

    dispatchChoiceEvents(list);
    return changed;
  }

  function removeCopySuffix(input) {
    if (!input) return false;

    const currentValue = input.value;
    if (!COPY_SUFFIX_REGEX.test(currentValue)) return false;

    const newValue = currentValue.replace(COPY_SUFFIX_REGEX, '');
    if (newValue === currentValue) return false;

    setNativeValue(input, newValue);
    dispatchValueEvents(input);
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

    incrementTargetNumber(input, 1);
    modal.dataset.tmAutoIncrementDone = '1';
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

  function enhanceModal(modal) {
    if (!modal) return;

    injectStyles();

    const input = getTitleInput(modal);
    if (input) {
      removeCopySuffix(input);
      autoIncrementOnce(modal, input);
      injectToolbar(modal, input);
    }

    uncheckTargetBoxes(modal);
  }

  function runEnhancements() {
    const modal = getDuplicateModal();
    if (!modal) {
      resetModalStateWhenClosed();
      return;
    }

    enhanceModal(modal);

    clearTimeout(modal.__tmRetry1);
    clearTimeout(modal.__tmRetry2);
    clearTimeout(modal.__tmRetry3);
    clearTimeout(modal.__tmRetry4);

    modal.__tmRetry1 = setTimeout(() => enhanceModal(modal), 50);
    modal.__tmRetry2 = setTimeout(() => enhanceModal(modal), 150);
    modal.__tmRetry3 = setTimeout(() => enhanceModal(modal), 350);
    modal.__tmRetry4 = setTimeout(() => enhanceModal(modal), 700);
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
