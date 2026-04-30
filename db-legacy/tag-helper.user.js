// ==UserScript==
// @name         Shopify Add Tags - Boxed Prefix Filter Buttons
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Keeps Shopify's native Add tags modal, makes it slightly taller, shrinks font, and adds boxed quick prefix filter buttons.
// @match        https://admin.shopify.com/store/tankobonbon-manga-book-store/products/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/tag-helper.user.js
// @downloadURL  https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/tag-helper.user.js
// ==/UserScript==

(function () {
  'use strict';

  const V = 'v28';
  const STYLE_ID = `tm-shopify-tags-style-${V}`;
  const PANEL = `tm-shopify-tags-panel-${V}`;
  const BTN = `tm-shopify-tags-btn-${V}`;
  const ROW = `tm-shopify-tags-row-${V}`;
  const SECTION = `tm-shopify-tags-section-${V}`;
  const FIELD = 's-internal-multi-picker-field[label="Tags"]';
  const VALUE = 's-internal-multi-picker-field-value';
  const OPTION_BLOCK = 's-internal-picker-option-group, s-internal-picker-option';

  const oldStyles = [
    'tm-shopify-tags-new-ui-style-v20',
    'tm-shopify-tags-new-ui-style-v21',
    'tm-shopify-tags-new-ui-style-v22',
    'tm-shopify-tags-new-ui-style-v23',
    'tm-shopify-tags-new-ui-style-v24',
    'tm-shopify-tags-new-ui-style-v25',
    'tm-shopify-tags-new-ui-style-v26',
    'tm-shopify-tags-new-ui-style-v27',
  ];

  const oldPanels = [
    '#tm-shopify-tags-always-panel-v20',
    '.tm-shopify-tags-dropdown-panel-v20',
    '.tm-shopify-tags-dropdown-panel-v21',
    '.tm-shopify-tags-dropdown-panel-v22',
    '.tm-shopify-tags-dropdown-panel-v23',
    '.tm-shopify-tags-dropdown-panel-v24',
    '.tm-shopify-tags-dropdown-panel-v25',
    '.tm-shopify-tags-dropdown-panel-v26',
    '.tm-shopify-tags-dropdown-panel-v27',
  ];

  const quickGroups = [
    [
      ['Cover not final', 'Cover not final'],
      ['Lounge', 'Lounge'],
      ['New License', 'New License'],
    ],
    [
      ['Single', 'Volume_Single'],
      ['Omnibus', 'Volume_Omnibus'],
    ],
    [
      ['Manga', 'Type_Manga'],
      ['Novel', 'Type_Novel'],
      ['Manhwa', 'Type_Manhwa'],
    ],
    [
      ['Debut', 'Class_Debut'],
      ['Standalone', 'Class_Standalone'],
      ['Box Set', 'Class_Box Set'],
      ['Final Volume', 'Class_Final Volume'],
    ],
    [
      ['Paperback', 'Format_Trade Paperback'],
      ['Hardcover', 'Format_Hardcover'],
    ],
  ];

  const priority = ['Adapted to', 'Age Rating', 'Publisher', 'Imprint'];

  const filters = [
    ['Adapted to', 'Adapted to_'],
    ['Age Rating', 'Age Rating_'],
    ['Class', 'Class_'],
    ['Demographic', 'Demographic_'],
    ['Format', 'Format_'],
    ['Genre', 'Genre_'],
    ['Imprint', 'Imprint_'],
    ['Price Code', 'Price Code_'],
    ['Publisher', 'Publisher_'],
    ['Release', 'Release_'],
    ['Status', 'Status_'],
    ['Type', 'Type_'],
    ['Volume', 'Volume_'],
  ].sort((a, b) => {
    const ai = priority.indexOf(a[0]);
    const bi = priority.indexOf(b[0]);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a[0].localeCompare(b[0], undefined, { sensitivity: 'base' });
  });

  const colors = [
    { key: 'cover', values: ['Cover not final'], bg: '#fecaca', border: '#ef4444', text: '#991b1b' },
    { key: 'lounge', values: ['Lounge'], bg: '#bbf7d0', border: '#22c55e', text: '#14532d' },
    { key: 'license', values: ['New License'], bg: '#bfdbfe', border: '#3b82f6', text: '#1e3a8a' },
    { key: 'class-special', values: ['Class_Debut', 'Class_Standalone'], bg: '#fde68a', border: '#f59e0b', text: '#92400e' },
  ];

  let timer = null;
  let settingSearch = false;
  let lastRun = 0;
  let lastSearch = '';

  const norm = (text) => (text || '').replace(/\s+/g, ' ').trim();
  const esc = (text) => String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const isProductPage = () => /^\/store\/tankobonbon-manga-book-store\/products\/[^/]+\/?$/.test(location.pathname);

  function cleanupOld() {
    oldStyles.forEach((id) => document.getElementById(id)?.remove());
    oldPanels.forEach((sel) => document.querySelectorAll(sel).forEach((el) => el.remove()));
    document.querySelectorAll(VALUE).forEach((chip) => {
      chip.shadowRoot?.querySelector('#tm-chip-style-v23')?.remove();
      chip.shadowRoot?.querySelector('#tm-chip-style-v24')?.remove();
    });
  }

  function chipCss(value, c) {
    const v = esc(value);
    return `
      ${VALUE}[value="${v}"],
      ${VALUE}[data-tm-tag-color="${c.key}"] {
        display: inline-flex !important;
        align-items: center !important;
        width: auto !important;
        min-height: 1.35rem !important;
        padding: 0.1rem 0.45rem !important;
        border-radius: 0.45rem !important;
        background: ${c.bg} !important;
        background-color: ${c.bg} !important;
        border: 1px solid ${c.border} !important;
        border-color: ${c.border} !important;
        box-shadow: inset 0 0 0 1px ${c.border} !important;
        color: ${c.text} !important;
        font-weight: 750 !important;
      }

      ${VALUE}[value="${v}"] *,
      ${VALUE}[data-tm-tag-color="${c.key}"] * {
        color: ${c.text} !important;
        font-weight: 750 !important;
      }
    `;
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${PANEL} {
        position: static !important;
        z-index: auto !important;
        display: block !important;
        box-sizing: border-box !important;
        width: auto !important;
        margin: 0.45rem 0 0.55rem 0 !important;
        padding: 0.55rem 0.6rem !important;
        border: 1px solid #d0d5dd !important;
        border-radius: 0.72rem !important;
        background: #fff !important;
        box-shadow: none !important;
      }

      .${SECTION} + .${SECTION} {
        margin-top: 0.48rem;
        padding-top: 0.48rem;
        border-top: 1px dashed #e5e7eb;
      }

      .tm-shopify-tags-heading-${V} {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.6rem;
        margin: 0 0 0.32rem 0;
        color: #4b5563;
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }

      .${ROW} {
        display: flex;
        flex-wrap: wrap;
        gap: 0.34rem;
      }

      .${ROW} + .${ROW} {
        margin-top: 0.34rem;
      }

      .${BTN} {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #c9cccf;
        background: #fff;
        color: #344054;
        border-radius: 999px;
        padding: 0.21rem 0.55rem;
        font-size: 0.7rem;
        font-weight: 650;
        line-height: 1.1;
        cursor: pointer;
        user-select: none;
      }

      .${BTN}:hover {
        background: #f8fafc;
        border-color: #98a2b3;
      }

      .${BTN}.is-priority {
        border-color: #b6d7ff;
        background: #eaf4ff;
        color: #184a8b;
      }

      .${BTN}.is-priority:hover,
      .${BTN}.is-priority.is-active {
        border-color: #6ea8fe;
        background: #cfe4ff;
        color: #123d73;
      }

      .${BTN}.is-clear {
        border-color: #e7b3b3;
        background: #fff6f6;
        color: #b42318;
      }

      .${BTN}.is-clear:hover {
        border-color: #d14343;
        background: #ffefef;
      }

      .${BTN}.is-active:not(.is-priority),
      .${BTN}[data-selected="true"] {
        border-color: #667085;
        background: #f2f4f7;
        color: #101828;
        font-weight: 800;
      }

      s-popover:has(s-internal-search-field[label="Tags"]) {
        max-height: 78vh !important;
      }

      s-popover:has(s-internal-search-field[label="Tags"]) s-internal-picker-option,
      s-popover:has(s-internal-search-field[label="Tags"]) s-internal-picker-option-group {
        font-size: 0.78rem !important;
        line-height: 1.15 !important;
      }

      ${colors.map((c) => c.values.map((value) => chipCss(value, c)).join('\n')).join('\n')}
    `;
    document.head.appendChild(style);
  }

  function tagsField() {
    return document.querySelector(FIELD) ||
      Array.from(document.querySelectorAll('s-internal-multi-picker-field'))
        .find((el) => norm(el.getAttribute('label')) === 'Tags') ||
      null;
  }

  function popover() {
    const field = tagsField();
    const id = field?.getAttribute('commandfor');
    if (id && document.getElementById(id)) return document.getElementById(id);

    return field?.parentElement?.querySelector('s-popover') ||
      Array.from(document.querySelectorAll('s-popover'))
        .find((el) => el.querySelector('s-internal-search-field[label="Tags"], s-internal-search-field[placeholder*="Search or add tags"]')) ||
      null;
  }

  const picker = () => popover()?.querySelector('s-internal-multi-picker') || null;
  const searchHost = () => popover()?.querySelector('s-internal-search-field[label="Tags"], s-internal-search-field[placeholder*="Search or add tags"]') || null;

  function deepInput(root) {
    if (!root) return null;
    const direct = root.querySelector?.('input, textarea');
    if (direct) return direct;

    const shadow = root.shadowRoot?.querySelector('input, textarea');
    if (shadow) return shadow;

    for (const el of root.querySelectorAll?.('*') || []) {
      const input = el.shadowRoot?.querySelector('input, textarea');
      if (input) return input;
    }

    return null;
  }

  const searchInput = () => deepInput(searchHost()) || deepInput(popover());

  function currentSearch() {
    const input = searchInput();
    if (input) return input.value || '';

    const host = searchHost();
    return host?.value || host?.getAttribute('value') || '';
  }

  function dispatchInput(target, value) {
    if (!target) return;

    try {
      target.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        composed: true,
        data: value,
        inputType: 'insertText',
      }));
    } catch {
      target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }

    target.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    target.dispatchEvent(new KeyboardEvent('keyup', {
      bubbles: true,
      composed: true,
      key: value ? value.slice(-1) : 'Backspace',
    }));
  }

  function setNativeValue(input, value) {
    if (!input) return;

    const proto = input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;

    const desc = Object.getOwnPropertyDescriptor(proto, 'value');

    if (desc?.set) desc.set.call(input, value);
    else input.value = value;

    dispatchInput(input, value);
  }

  function setSearch(value) {
    lastSearch = value;
    settingSearch = true;

    const host = searchHost();
    const input = searchInput();

    if (host) {
      try { host.value = value; } catch {}
      try { host.setAttribute('value', value); } catch {}
      dispatchInput(host, value);
    }

    if (input) setNativeValue(input, value);

    setTimeout(() => {
      settingSearch = false;
      updateStates();
    }, 100);
  }

  function selectedTags() {
    return Array.from(tagsField()?.querySelectorAll(VALUE) || [])
      .map((chip) => chip.getAttribute('value') || norm(chip.textContent))
      .filter(Boolean);
  }

  function paletteFor(value) {
    return colors.find((c) => c.values.includes(value)) || null;
  }

  function resetChip(chip) {
    chip.removeAttribute('data-tm-tag-color');

    [
      'display',
      'align-items',
      'width',
      'min-height',
      'padding',
      'border-radius',
      'background',
      'background-color',
      'border',
      'border-color',
      'box-shadow',
      'color',
      'font-weight',
    ].forEach((prop) => chip.style.removeProperty(prop));
  }

  function paintChip(chip, c) {
    chip.setAttribute('data-tm-tag-color', c.key);

    Object.entries({
      display: 'inline-flex',
      'align-items': 'center',
      width: 'auto',
      'min-height': '1.35rem',
      padding: '0.1rem 0.45rem',
      'border-radius': '0.45rem',
      background: c.bg,
      'background-color': c.bg,
      border: `1px solid ${c.border}`,
      'border-color': c.border,
      'box-shadow': `inset 0 0 0 1px ${c.border}`,
      color: c.text,
      'font-weight': '750',
    }).forEach(([prop, value]) => chip.style.setProperty(prop, value, 'important'));

    chip.shadowRoot?.querySelectorAll('[part], button, span, div, s-text, s-internal-text')
      .forEach((el) => {
        el.style.setProperty('color', c.text, 'important');
        el.style.setProperty('font-weight', '750', 'important');
      });
  }

  function colorChips() {
    document.querySelectorAll(VALUE).forEach((chip) => {
      const value = chip.getAttribute('value') || norm(chip.textContent);
      const color = paletteFor(value);

      resetChip(chip);
      if (color) paintChip(chip, color);
    });
  }

  function heading(left, right = '') {
    const el = document.createElement('div');
    el.className = `tm-shopify-tags-heading-${V}`;
    el.innerHTML = `<span>${left}</span>${right ? `<span>${right}</span>` : ''}`;
    return el;
  }

  function pill(label, data = {}) {
    const el = document.createElement('span');
    el.className = BTN;
    el.textContent = label;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '-1');

    if ('quickValue' in data) el.dataset.quickValue = data.quickValue;
    if ('filterValue' in data) el.dataset.filterValue = data.filterValue;
    if (data.priority) el.classList.add('is-priority');
    if (data.clear) el.classList.add('is-clear');

    return el;
  }

  function panel() {
    const wrap = document.createElement('div');
    wrap.className = PANEL;

    const quick = document.createElement('div');
    quick.className = SECTION;
    quick.appendChild(heading('Quick tags', 'fills search'));

    quickGroups.forEach((group) => {
      const row = document.createElement('div');
      row.className = ROW;
      group.forEach(([label, value]) => row.appendChild(pill(label, { quickValue: value })));
      quick.appendChild(row);
    });

    const filterSection = document.createElement('div');
    filterSection.className = SECTION;
    filterSection.appendChild(heading('Search groups', 'filters native results'));

    const filterRow = document.createElement('div');
    filterRow.className = ROW;
    filters.forEach(([label, value]) => {
      filterRow.appendChild(pill(label, {
        filterValue: value,
        priority: priority.includes(label),
      }));
    });

    const clearRow = document.createElement('div');
    clearRow.className = ROW;
    clearRow.appendChild(pill('Clear search', { filterValue: '', clear: true }));

    filterSection.appendChild(filterRow);
    filterSection.appendChild(clearRow);

    wrap.appendChild(quick);
    wrap.appendChild(filterSection);

    return wrap;
  }

  function installPanel() {
    const pick = picker();
    if (!pick) return;

    let wrap = pick.querySelector(`.${PANEL}`);
    if (!wrap) wrap = panel();

    const firstResult = Array.from(pick.children).find((el) => el.matches?.(OPTION_BLOCK));

    if (firstResult) {
      if (wrap.parentElement !== pick || wrap.nextElementSibling !== firstResult) {
        pick.insertBefore(wrap, firstResult);
      }
    } else if (wrap.parentElement !== pick) {
      pick.appendChild(wrap);
    }
  }

  function helperFromEvent(event) {
    for (const item of event.composedPath?.() || []) {
      if (item?.classList?.contains?.(BTN)) return item;
    }
    return event.target?.closest?.(`.${BTN}`) || null;
  }

  function stop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  }

  function runHelper(el) {
    const now = Date.now();
    if (now - lastRun < 160) return;

    lastRun = now;

    const value = 'quickValue' in el.dataset
      ? el.dataset.quickValue
      : 'filterValue' in el.dataset
        ? el.dataset.filterValue
        : '';

    setSearch(value);
    setTimeout(() => setSearch(value), 50);
    setTimeout(() => setSearch(value), 140);
    setTimeout(updateStates, 160);
  }

  function guardClicks() {
    if (document.documentElement.dataset.tmTagsGuardV28 === 'true') return;
    document.documentElement.dataset.tmTagsGuardV28 = 'true';

    ['pointerdown', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'focusin', 'focusout'].forEach((type) => {
      window.addEventListener(type, (event) => {
        const helper = helperFromEvent(event);
        if (!helper) return;

        stop(event);

        if (type === 'pointerdown' || type === 'touchstart' || (!window.PointerEvent && type === 'mousedown')) {
          runHelper(helper);
        }
      }, true);

      document.addEventListener(type, (event) => {
        const helper = helperFromEvent(event);
        if (helper) stop(event);
      }, true);
    });
  }

  function updateStates() {
    const selected = new Set(selectedTags());
    const search = currentSearch();

    document.querySelectorAll(`.${BTN}[data-quick-value]`).forEach((el) => {
      el.toggleAttribute('data-selected', selected.has(el.dataset.quickValue || ''));
    });

    document.querySelectorAll(`.${BTN}[data-filter-value]`).forEach((el) => {
      const value = el.dataset.filterValue || '';
      el.classList.toggle('is-active', el.classList.contains('is-clear') ? !search : !!value && search === value);
    });
  }

  function watchSearch() {
    const pop = popover();
    if (!pop || pop.dataset.tmTagsWatcherV28 === 'true') return;

    pop.dataset.tmTagsWatcherV28 = 'true';

    pop.addEventListener('input', () => {
      if (!settingSearch) setTimeout(updateStates, 80);
    }, true);

    pop.addEventListener('change', () => {
      if (settingSearch) return;
      setTimeout(updateStates, 80);
      setTimeout(colorChips, 120);
    }, true);

    pop.addEventListener('toggle', () => {
      setTimeout(() => {
        installPanel();
        if (lastSearch) setSearch(lastSearch);
        updateStates();
      }, 80);
    }, true);
  }

  function apply() {
    if (!isProductPage()) return;

    cleanupOld();
    addStyles();
    installPanel();
    guardClicks();
    watchSearch();
    colorChips();
    updateStates();
  }

  function scheduleApply() {
    clearTimeout(timer);
    timer = setTimeout(apply, 120);
  }

  apply();

  new MutationObserver(scheduleApply).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['value', 'open', 'aria-expanded', 'style'],
  });

  const pushState = history.pushState;
  history.pushState = function (...args) {
    const result = pushState.apply(this, args);
    setTimeout(scheduleApply, 80);
    return result;
  };

  const replaceState = history.replaceState;
  history.replaceState = function (...args) {
    const result = replaceState.apply(this, args);
    setTimeout(scheduleApply, 80);
    return result;
  };

  window.addEventListener('popstate', scheduleApply);
})();
