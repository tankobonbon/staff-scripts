// ==UserScript==
// @name         Shopify Add Tags - Boxed Prefix Filter Buttons
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Keeps Shopify's native Add tags modal, makes it slightly taller, shrinks font, and adds boxed quick prefix filter buttons.
// @match        https://admin.shopify.com/store/tankobonbon-manga-book-store/products/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const STYLE_ID = 'tm-shopify-tags-filter-cloud-style-v17';
  const MODAL_CLASS = 'tm-shopify-tags-modal-v17';
  const CLOUD_BOX_CLASS = 'tm-shopify-tags-cloud-box-v17';
  const CLOUD_CLASS = 'tm-shopify-tags-cloud-v17';

  const FIXED_FILTERS = [
    { label: 'Cover not final', value: 'Cover not final' },
    { label: 'Lounge', value: 'Lounge' },
  ];

  const PREFIX_FILTERS = [
    { label: 'Adapted to', value: 'Adapted to_' },
    { label: 'Age Rating', value: 'Age Rating_' },
    { label: 'Class', value: 'Class_' },
    { label: 'Demographic', value: 'Demographic_' },
    { label: 'Format', value: 'Format_' },
    { label: 'Genre', value: 'Genre_' },
    { label: 'Imprint', value: 'Imprint_' },
    { label: 'Price Code', value: 'Price Code_' },
    { label: 'Publisher', value: 'Publisher_' },
    { label: 'Release', value: 'Release_' },
    { label: 'Status', value: 'Status_' },
    { label: 'Type', value: 'Type_' },
    { label: 'Volume', value: 'Volume_' },
  ].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

  const FILTERS = [
    ...FIXED_FILTERS,
    ...PREFIX_FILTERS,
    { label: 'Clear', value: '' },
  ];

  let timer = null;

  function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${MODAL_CLASS} {
        max-height: 88vh !important;
        height: 88vh !important;
        display: flex !important;
        flex-direction: column !important;
      }

      .${MODAL_CLASS}.Polaris-Modal-Dialog--limitHeight,
      .${MODAL_CLASS} .Polaris-Modal-Dialog--limitHeight,
      .${MODAL_CLASS} .Polaris-Modal-Dialog__Modal {
        max-height: 88vh !important;
      }

      .${MODAL_CLASS} .Polaris-Modal__Body,
      .${MODAL_CLASS} .Polaris-Scrollable {
        flex: 1 1 auto !important;
        min-height: 0 !important;
      }

      .${MODAL_CLASS} .Polaris-Modal-Footer {
        margin-top: auto !important;
        background: var(--p-color-bg-surface, #fff) !important;
        position: sticky !important;
        bottom: 0 !important;
        z-index: 2 !important;
      }

      .${MODAL_CLASS} .Polaris-Text--bodyMd,
      .${MODAL_CLASS} .Polaris-Text--bodySm,
      .${MODAL_CLASS} .Polaris-OptionList-Option__Label,
      .${MODAL_CLASS} [id$="-label"] {
        font-size: 0.78rem !important;
        line-height: 1.15 !important;
      }

      .${MODAL_CLASS} .Polaris-Checkbox {
        transform: scale(0.92);
        transform-origin: center center;
      }

      .${MODAL_CLASS} .Polaris-OptionList-Option {
        margin: 0 !important;
        list-style: none;
      }

      .${MODAL_CLASS} .Polaris-OptionList-Option__Label {
        display: flex !important;
        align-items: center !important;
        gap: 0.38rem !important;
        padding: 0.16rem 0.24rem !important;
        border-radius: 0.38rem;
      }

      .${MODAL_CLASS} .Polaris-OptionList-Option__Label:hover {
        background: var(--p-color-bg-surface-secondary, #f6f6f7);
      }

      .${MODAL_CLASS} .Polaris-OptionList-Option__Checkbox {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding-top: 0 !important;
        margin-top: 0 !important;
      }

      .${MODAL_CLASS} .Polaris-Modal-Section section {
        padding-top: 0.75rem !important;
        padding-bottom: 0.55rem !important;
      }

      .${MODAL_CLASS} .${CLOUD_BOX_CLASS} {
        margin: 0.7rem 0 0.42rem 0 !important;
        padding: 0.55rem 0.62rem !important;
        border: 1px solid var(--p-color-border, #d0d0d0) !important;
        border-radius: 0.75rem !important;
        background: var(--p-color-bg-surface, #fff) !important;
      }

      .${MODAL_CLASS} .${CLOUD_CLASS} {
        display: flex;
        flex-wrap: wrap;
        gap: 0.42rem;
      }

      .${MODAL_CLASS} .${CLOUD_CLASS}-btn {
        appearance: none;
        border: 1px solid var(--p-color-border, #c9cccf);
        background: var(--p-color-bg-surface, #fff);
        color: inherit;
        border-radius: 999px;
        padding: 0.22rem 0.58rem;
        font-size: 0.72rem;
        line-height: 1.1;
        cursor: pointer;
      }

      .${MODAL_CLASS} .${CLOUD_CLASS}-btn:hover {
        background: var(--p-color-bg-surface-secondary, #f6f6f7);
      }

      .${MODAL_CLASS} .${CLOUD_CLASS}-btn.is-active {
        border-color: var(--p-color-border-emphasis, #8c9196);
        background: var(--p-color-bg-surface-secondary, #f6f6f7);
        font-weight: 600;
      }

      .${MODAL_CLASS} .${CLOUD_CLASS}-btn.is-clear {
        border-color: #e7b3b3;
        color: #b42318;
        background: #fff6f6;
      }

      .${MODAL_CLASS} .${CLOUD_CLASS}-btn.is-clear:hover {
        background: #ffefef;
      }

      .${MODAL_CLASS} .${CLOUD_CLASS}-btn.is-clear.has-value {
        border-color: #d14343;
        color: #ffffff;
        background: #d14343;
        font-weight: 700;
      }

      .${MODAL_CLASS} .${CLOUD_CLASS}-btn.is-clear.has-value:hover {
        background: #b93838;
        border-color: #b93838;
      }

      .${MODAL_CLASS} h3.Polaris-Text--headingSm {
        margin-top: 0.18rem !important;
        margin-bottom: 0.28rem !important;
      }

      .${MODAL_CLASS} .Polaris-Modal-Footer .Polaris-Box {
        padding-block-start: 0.48rem !important;
        padding-block-end: 0.48rem !important;
      }

      .${MODAL_CLASS} .Polaris-Modal-Footer .Polaris-InlineStack {
        row-gap: 0.3rem !important;
      }
    `;
    document.head.appendChild(style);
  }

  function findAddTagsModal() {
    const headings = Array.from(
      document.querySelectorAll('.Polaris-Modal-Dialog h2, .Polaris-Modal-Dialog [role="heading"]')
    );

    const heading = headings.find((el) => normalizeText(el.textContent) === 'Add tags');
    if (!heading) return null;

    const dialog = heading.closest('.Polaris-Modal-Dialog');
    const modal = dialog?.querySelector('.Polaris-Modal-Dialog__Modal') || null;

    return { dialog, modal };
  }

  function getSearchInput(modal) {
    return modal.querySelector('input[placeholder*="Search to find or create tags"]');
  }

  function getTopControlsRow(modal) {
    const input = getSearchInput(modal);
    if (!input) return null;

    return (
      input.closest('.Polaris-LegacyStack') ||
      input.closest('.Polaris-Box') ||
      input.parentElement
    );
  }

  function setNativeInputValue(input, value) {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (descriptor?.set) {
      descriptor.set.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function updateActiveButtons(modal) {
    const input = getSearchInput(modal);
    if (!input) return;

    const current = input.value || '';
    const hasValue = current.trim().length > 0;
    const buttons = modal.querySelectorAll(`.${CLOUD_CLASS}-btn[data-filter-value]`);

    buttons.forEach((btn) => {
      const value = btn.getAttribute('data-filter-value') || '';
      btn.classList.toggle('is-active', current === value);

      if (btn.classList.contains('is-clear')) {
        btn.classList.toggle('has-value', hasValue);
      }
    });
  }

  function createCloudBox(modal) {
    const box = document.createElement('div');
    box.className = CLOUD_BOX_CLASS;

    const cloud = document.createElement('div');
    cloud.className = CLOUD_CLASS;

    FILTERS.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `${CLOUD_CLASS}-btn`;
      btn.textContent = item.label;
      btn.setAttribute('data-filter-value', item.value);

      if (item.label === 'Clear') {
        btn.classList.add('is-clear');
      }

      btn.addEventListener('click', () => {
        const input = getSearchInput(modal);
        if (!input) return;

        setNativeInputValue(input, item.value);
        input.focus();
        updateActiveButtons(modal);
        tightenAddRows(modal);
      });

      cloud.appendChild(btn);
    });

    box.appendChild(cloud);
    return box;
  }

  function tightenAddRows(modal) {
    const candidates = Array.from(modal.querySelectorAll('a, .Polaris-Link'));

    candidates.forEach((el) => {
      const text = normalizeText(el.textContent);
      if (!text.startsWith('Add "')) return;

      el.style.marginTop = '0';
      el.style.marginBottom = '0.18rem';
      el.style.display = 'inline-flex';
      el.style.alignItems = 'center';

      let wrapper = el.parentElement;
      let depth = 0;

      while (wrapper && wrapper !== modal && depth < 4) {
        wrapper.style.marginTop = '0';
        wrapper.style.marginBottom = depth === 0 ? '0.18rem' : '0';
        depth += 1;
        wrapper = wrapper.parentElement;
      }
    });
  }

  function enhanceModal() {
    addStyles();

    const found = findAddTagsModal();
    if (!found?.modal) return;

    const modal = found.modal;
    modal.classList.add(MODAL_CLASS);

    const input = getSearchInput(modal);
    if (!input) return;

    const topControlsRow = getTopControlsRow(modal);
    if (!topControlsRow) return;

    let box = modal.querySelector(`.${CLOUD_BOX_CLASS}`);
    if (!box) {
      box = createCloudBox(modal);
      topControlsRow.insertAdjacentElement('afterend', box);
    }

    if (!input.dataset.tmCloudBound) {
      input.dataset.tmCloudBound = 'true';
      input.addEventListener('input', () => {
        updateActiveButtons(modal);
        tightenAddRows(modal);
      });
      input.addEventListener('change', () => {
        updateActiveButtons(modal);
        tightenAddRows(modal);
      });
      input.addEventListener('keyup', () => {
        updateActiveButtons(modal);
        tightenAddRows(modal);
      });
    }

    updateActiveButtons(modal);
    tightenAddRows(modal);
  }

  function scheduleEnhance() {
    clearTimeout(timer);
    timer = setTimeout(enhanceModal, 120);
  }

  enhanceModal();

  const observer = new MutationObserver(() => {
    scheduleEnhance();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
