// ==UserScript==
// @name         Shopify Product Edit - Clean Layout + Clear Description + Tag Quick Buttons
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Lightweight cleanup for Shopify product edit page + quick tag autofill buttons + move SKU/barcode above handle + top button + trim description end spaces + tag highlights
// @match        https://admin.shopify.com/store/tankobonbon-manga-book-store/products/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/product-form-cleaner.user.js
// @downloadURL  https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/product-form-cleaner.user.js
// ==/UserScript==

(function () {
  'use strict';

  const STYLE_ID = 'tm-shopify-clean-style-v34';
  const BTN_CLASS = 'tm-shopify-clear-btn';
  const ROW_CLASS = 'tm-shopify-clear-row';
  const HIDDEN_ATTR = 'data-tm-hidden';
  const DESCRIPTION_BTN_ID = 'description';
  const DESCRIPTION_TRIM_BTN_ID = 'description-trim-end';

  const TAG_ACTIONS_ID = 'tm-tag-quick-actions';
  const TAG_BTN_CLASS = 'tm-tag-quick-btn';
  const TAG_CLEAR_CLASS = 'tm-tag-quick-clear';
  const QUICK_TAGS = [
    [{ label: 'Cover not final', value: 'Cover not final' }, { label: 'Lounge', value: 'Lounge' }, { label: 'New License', value: 'New License' }],
    [{ label: 'Single', value: 'Volume_Single' }, { label: 'Omnibus', value: 'Volume_Omnibus' }],
    [{ label: 'Manga', value: 'Type_Manga' }, { label: 'Novel', value: 'Type_Novel' }, { label: 'Manhwa', value: 'Type_Manhwa' }],
    [
      { label: 'Debut', value: 'Class_Debut' },
      { label: 'Standalone', value: 'Class_Standalone' },
      { label: 'Box Set', value: 'Class_Box Set' },
      { label: 'Final Volume', value: 'Class_Final Volume' }
    ],
    [
      { label: 'Paperback', value: 'Format_Trade Paperback' },
      { label: 'Hardcover', value: 'Format_Hardcover' }
    ]
  ];

  const TAG_GROUP_CLASS = 'tm-tag-quick-group';

  const MOVED_WRAP_CLASS = 'tm-shopify-moved-inventory-wrap';
  const SKU_ACTIONS_ID = 'tm-sku-copy-actions';
  const TOP_JUMP_ROW_ID = 'tm-top-jump-row';

  let applyTimer = null;

  function isProductEditPage() {
    return /^\/store\/tankobonbon-manga-book-store\/products\/[^/]+\/?$/.test(location.pathname);
  }

  function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
  .Polaris-Breadcrumbs__PageTitle h1 {
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: unset !important;
    word-break: break-word;
  }

  .${ROW_CLASS} {
    display: flex;
    justify-content: flex-end;
    margin: 0.35rem 0 0.45rem 0.4rem;
  }

  .${BTN_CLASS} {
    appearance: none;
    border: 1px solid #d0d5dd;
    background: #fff;
    color: #b42318;
    border-radius: 0.5rem;
    padding: 0.2rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    line-height: 1.15;
    cursor: pointer;
  }

  .${BTN_CLASS}:hover {
    background: #fff5f5;
  }

  .${BTN_CLASS}:disabled {
    opacity: 0.6;
    cursor: default;
  }

  [${HIDDEN_ATTR}="true"] {
    display: none !important;
  }

  #${TAG_ACTIONS_ID} {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin: 0.45rem 0 0.55rem 0;
  }

  .${TAG_BTN_CLASS},
  .${TAG_CLEAR_CLASS} {
    appearance: none;
    background: #fff;
    border-radius: 0.5rem;
    padding: 0.28rem 0.72rem;
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.2;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .${TAG_BTN_CLASS} {
    border: 1px dashed #98a2b3;
    color: #344054;
  }

  .${TAG_BTN_CLASS}:hover {
    background: #f8fafc;
    border-color: #667085;
  }

  .${TAG_CLEAR_CLASS} {
    border: 1px dashed #fda29b;
    color: #b42318;
  }

  .${TAG_CLEAR_CLASS}:hover {
    background: #fff5f5;
    border-color: #f97066;
  }

  .${TAG_GROUP_CLASS} {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    width: 100%;
  }

  .${MOVED_WRAP_CLASS} {
    margin-bottom: 0.75rem;
  }

  #${SKU_ACTIONS_ID} {
    display: flex;
    justify-content: flex-end;
    margin: 0 0 0.5rem 0;
  }

  #${SKU_ACTIONS_ID} button {
    appearance: none;
    border: 1px solid #d0d5dd;
    background: #fff;
    color: #344054;
    border-radius: 0.5rem;
    padding: 0.35rem 0.7rem;
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.2;
    cursor: pointer;
  }

  #${SKU_ACTIONS_ID} button:hover {
    background: #f8fafc;
  }

  #${TOP_JUMP_ROW_ID} {
    display: block;
    width: 100%;
    margin: 0.75rem 0 0.25rem 0;
  }

  #${TOP_JUMP_ROW_ID} button {
    appearance: none;
    display: block;
    width: 100%;
    border: 1px solid #b7d7c0;
    background: #e7f6ea;
    color: #245c35;
    border-radius: 0.75rem;
    padding: 0.7rem 0.9rem;
    font-size: 0.82rem;
    font-weight: 700;
    line-height: 1.2;
    cursor: pointer;
    text-align: center;
  }

  #${TOP_JUMP_ROW_ID} button:hover {
    background: #dcf1e1;
  }

  @media (min-width: 30.625em) {
    .Polaris-Page {
      max-width: 75% !important;
    }
  }
`;
    document.head.appendChild(style);
  }

  function markHidden(el) {
    if (!el) return;
    el.setAttribute(HIDDEN_ATTR, 'true');
  }

  function removeLegacyButtons() {
    document
      .querySelectorAll('.tm-shopify-clear-row[data-tm-clear-id="preview"], .tm-shopify-clear-row[data-tm-clear-id="release-date"]')
      .forEach((el) => el.remove());
  }

  function findDescriptionIframe() {
    const iframes = document.querySelectorAll('iframe');

    for (const iframe of iframes) {
      try {
        const body = iframe.contentDocument?.querySelector('body#tinymce');
        if (body) return iframe;
      } catch {
        // ignore inaccessible iframes
      }
    }

    return null;
  }

  function dispatchEditorChangeSignals(doc, body) {
    body.dispatchEvent(new Event('input', { bubbles: true }));
    body.dispatchEvent(new Event('change', { bubbles: true }));
    body.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Backspace' }));
    doc.dispatchEvent(new Event('input', { bubbles: true }));
    doc.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function clearTinyMceDescription() {
    const iframe = findDescriptionIframe();
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument;
      const body = doc?.querySelector('body#tinymce');
      if (!body) return;

      iframe.focus();
      body.focus();

      body.innerHTML = '<p><br data-mce-bogus="1"></p>';
      dispatchEditorChangeSignals(doc, body);

      body.blur();
      iframe.blur();
    } catch (error) {
      console.error('[TM] Failed to clear description:', error);
    }
  }

  function isIgnorableTrailingNode(node) {
    if (!node) return true;

    if (node.nodeType === Node.COMMENT_NODE) return true;

    if (node.nodeType === Node.TEXT_NODE) {
      return !node.nodeValue || /^[\s\u00A0]*$/.test(node.nodeValue);
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName?.toLowerCase();

      if (tag === 'br') return true;

      if (!node.childNodes.length) {
        const text = node.textContent || '';
        return /^[\s\u00A0]*$/.test(text);
      }

      return Array.from(node.childNodes).every(isIgnorableTrailingNode);
    }

    return false;
  }

  function trimTrailingWhitespaceNodes(node) {
    if (!node || !node.childNodes) return;

    while (node.lastChild && isIgnorableTrailingNode(node.lastChild)) {
      node.removeChild(node.lastChild);
    }

    const last = node.lastChild;
    if (!last) return;

    if (last.nodeType === Node.TEXT_NODE) {
      last.nodeValue = (last.nodeValue || '').replace(/[\s\u00A0]+$/g, '');
      if (!last.nodeValue) {
        node.removeChild(last);
      }
      return;
    }

    if (last.nodeType === Node.ELEMENT_NODE) {
      trimTrailingWhitespaceNodes(last);

      if (isIgnorableTrailingNode(last)) {
        node.removeChild(last);
      }
    }
  }

  function trimTinyMceDescriptionEndOnly() {
    const iframe = findDescriptionIframe();
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument;
      const body = doc?.querySelector('body#tinymce');
      if (!body) return;

      iframe.focus();
      body.focus();

      trimTrailingWhitespaceNodes(body);

      if (!body.innerHTML || !body.textContent.trim()) {
        body.innerHTML = '<p><br data-mce-bogus="1"></p>';
      }

      dispatchEditorChangeSignals(doc, body);

      body.blur();
      iframe.blur();
    } catch (error) {
      console.error('[TM] Failed to trim description ending:', error);
    }
  }

  function makeButton(text, onClick, workingText = 'Working...') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BTN_CLASS;
    btn.textContent = text;

    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = workingText;

      try {
        await onClick();
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });

    return btn;
  }

  function installDescriptionButtons() {
    const iframe = findDescriptionIframe();
    if (!iframe) return;

    const section =
      iframe.closest('section') ||
      iframe.closest('.Polaris-ShadowBevel') ||
      iframe.closest('.Polaris-LegacyCard') ||
      iframe.closest('.Polaris-Card') ||
      iframe.parentElement;

    if (!section) return;

    let clearRow = section.querySelector(`[data-tm-clear-id="${DESCRIPTION_BTN_ID}"]`);
    if (!clearRow) {
      clearRow = document.createElement('div');
      clearRow.className = ROW_CLASS;
      clearRow.dataset.tmClearId = DESCRIPTION_BTN_ID;
      clearRow.appendChild(makeButton('Clear', clearTinyMceDescription, 'Clearing...'));
      iframe.insertAdjacentElement('beforebegin', clearRow);
    }

    let trimRow = section.querySelector(`[data-tm-clear-id="${DESCRIPTION_TRIM_BTN_ID}"]`);
    if (!trimRow) {
      trimRow = document.createElement('div');
      trimRow.className = ROW_CLASS;
      trimRow.dataset.tmClearId = DESCRIPTION_TRIM_BTN_ID;
      trimRow.appendChild(makeButton('Trim', trimTinyMceDescriptionEndOnly, 'Trimming...'));
    }

    if (clearRow.nextElementSibling !== trimRow) {
      clearRow.insertAdjacentElement('afterend', trimRow);
    }
  }

  function hideSectionByHeadingText(text) {
    const headings = Array.from(
      document.querySelectorAll('s-internal-heading, h1, h2, h3, h4, h5, h6, div, span, p')
    ).filter((el) => normalizeText(el.textContent) === text);

    headings.forEach((heading) => {
      const section = heading.closest('s-internal-section');
      const card = heading.closest('.Polaris-LegacyCard');
      const wrapper = section?.parentElement || card || heading.parentElement;
      markHidden(wrapper);
    });
  }

  function hidePublishingSection() {
      const publishingSections = document.querySelectorAll('s-internal-section[heading="Publishing"]');

      publishingSections.forEach((section) => {
          const wrapper =
                section.closest('.Polaris-Box') ||
                section.parentElement;

          if (wrapper) {
              markHidden(wrapper);
          }
      });
  }

  function hideSalesSection() {
    hideSectionByHeadingText('Sales');
  }

  function hideThemeTemplateSection() {
    const label = Array.from(
      document.querySelectorAll('div, span, p, label')
    ).find((el) => normalizeText(el.textContent) === 'Theme template');

    if (!label) return;
    markHidden(label.closest('.Polaris-LegacyCard'));
  }

  function hideCategoryPickerSection() {
    const anchor = document.getElementById('ProductCategoryPickerAnchor');
    if (!anchor) return;

    const wrapper =
      anchor.closest('.Polaris-FormLayout__Item') ||
      anchor.parentElement;

    markHidden(wrapper);
  }

  function hideInventoryQuantitiesSection() {
    const historyLink = document.querySelector(
      's-internal-link[href*="/inventory_history"], a[href*="/inventory_history"]'
    );
    if (!historyLink) return;

    const wrapper =
      historyLink.closest('.Polaris-FormLayout__Item') ||
      historyLink.closest('.Polaris-BlockStack') ||
      historyLink.parentElement;

    markHidden(wrapper);
  }

  function hidePriceSection() {
    hideSectionByHeadingText('Price');
  }

  function hideShippingSection() {
    const heading = Array.from(
      document.querySelectorAll('s-internal-heading, h2, h3')
    ).find((el) => normalizeText(el.textContent) === 'Shipping');

    if (!heading) return;

    const section = heading.closest('s-internal-section');
    if (section) {
      const wrapper =
        section.parentElement?.parentElement ||
        section.parentElement ||
        section;
      markHidden(wrapper);
      return;
    }

    hideSectionByHeadingText('Shipping');
  }

  function hideVariantsSection() {
    hideSectionByHeadingText('Variants');
  }

  function hideCategoryMetafieldsSection() {
    const anchor = document.getElementById('constrained-metafields-anchor');
    if (!anchor) return;

    markHidden(anchor);
  }

  function hideVariantMetafieldsSection() {
    const headings = Array.from(
      document.querySelectorAll('s-internal-heading, h2, h3')
    ).filter((el) => normalizeText(el.textContent) === 'Variant metafields');
  
    headings.forEach((heading) => {
      const section = heading.closest('s-internal-section');
      if (section) {
        section.setAttribute(HIDDEN_ATTR, 'true');
      }
    });
  }

  function expandInventoryCollapsible() {
    const collapsible = document.getElementById('product_variant_collapsible_inventory');
    if (!collapsible) return;

    const toggleButton =
      document.querySelector('button._CollapsibleButton_1kcox_1[aria-controls="product_variant_collapsible_inventory"]') ||
      document.querySelector('button[aria-controls="product_variant_collapsible_inventory"][aria-expanded]');

    if (!toggleButton) return;

    const isClosed =
      toggleButton.getAttribute('aria-expanded') === 'false' ||
      collapsible.getAttribute('aria-hidden') === 'true' ||
      collapsible.classList.contains('Polaris-Collapsible--isFullyClosed');

    if (isClosed) {
      toggleButton.click();
    }
  }

  function findHeadingByText(text) {
    return Array.from(
      document.querySelectorAll('s-internal-heading, h1, h2, h3, h4, h5, h6')
    ).find((el) => normalizeText(el.textContent) === text);
  }

  function expandAndCleanSearchEngineListing() {
    const handleInput = document.querySelector('input[name="handle"]');

    if (!handleInput) {
      const heading = findHeadingByText('Search engine listing');
      if (!heading) return;

      const previewBox = heading.closest('.Polaris-Box') || heading.parentElement;
      if (!previewBox) return;

      const editButton =
        previewBox.querySelector('s-internal-button[icon="edit"]') ||
        previewBox.querySelector('s-internal-button[accessibilitylabel="Edit"]');

      if (!editButton) return;

      if (editButton.dataset.tmClicked !== 'true') {
        editButton.dataset.tmClicked = 'true';
        editButton.click();
        editButton.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true })
        );
      }

      return;
    }

    const seoTitleItem = document
      .querySelector('input[name="seoTitle"]')
      ?.closest('.Polaris-FormLayout__Item');
    markHidden(seoTitleItem);

    const seoDescriptionItem = document
      .querySelector('textarea[name="seoDescription"]')
      ?.closest('.Polaris-FormLayout__Item');
    markHidden(seoDescriptionItem);

    const heading = findHeadingByText('Search engine listing');
    const previewBox = heading?.closest('.Polaris-Box');
    markHidden(previewBox);

    let editorBox = handleInput.parentElement;
    while (editorBox && editorBox !== document.body) {
      const hasHandle = !!editorBox.querySelector?.('input[name="handle"]');
      const hasRedirect = !!editorBox.querySelector?.('input[name="redirectNewHandle"]');
      if (hasHandle && hasRedirect) break;
      editorBox = editorBox.parentElement;
    }

    const divider = editorBox?.previousElementSibling;
    if (divider?.tagName === 'S-DIVIDER') {
      markHidden(divider);
    }
  }

  function setNativeInputValue(input, value) {
    if (!input) return;

    const proto =
      input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;

    const descriptor =
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value') ||
      Object.getOwnPropertyDescriptor(proto, 'value');

    if (descriptor?.set) {
      descriptor.set.call(input, value);
    } else {
      input.value = value;
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent('keyup', {
        bubbles: true,
        key: value ? value.slice(-1) : 'Backspace'
      })
    );
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function getBarcodeInput() {
    const direct = document.querySelector('input[name="barcode"]');
    if (direct) return direct;

    const host = document.querySelector('s-internal-text-field[name="barcode"], #InventoryCardBarcode');
    if (!host) return null;

    const inner =
      host.querySelector('input, textarea') ||
      host.shadowRoot?.querySelector?.('input, textarea');

    return inner || null;
  }

  function focusAndSetInputValue(input, value) {
    if (!input) return false;

    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }

    setNativeInputValue(input, value);

    try {
      input.blur();
    } catch {}

    return true;
  }

  function focusAndOpenTagInput(input) {
    if (!input) return;

    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }

    input.click();
    input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    input.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  }

  function autofillTagSearch(tagText) {
    const input = document.querySelector('input[name="tags"]');
    if (!input) return;

    focusAndOpenTagInput(input);

    requestAnimationFrame(() => {
      setNativeInputValue(input, tagText);

      requestAnimationFrame(() => {
        focusAndOpenTagInput(input);
      });
    });
  }

  function clearTagSearch() {
    const input = document.querySelector('input[name="tags"]');
    if (!input) return;

    focusAndOpenTagInput(input);

    requestAnimationFrame(() => {
      setNativeInputValue(input, '');

      requestAnimationFrame(() => {
        focusAndOpenTagInput(input);
      });
    });
  }

  function makeQuickTagButton(label, onClick, extraClass = '') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = extraClass || TAG_BTN_CLASS;
    btn.textContent = label;

    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });

    return btn;
  }

  function installTagQuickButtons() {
    const input = document.querySelector('input[name="tags"]');
    if (!input) return;

    const textFieldWrapper = input.closest('.TextFieldWrapper');
    if (!textFieldWrapper) return;

    const labelledRoot =
      textFieldWrapper.querySelector('.Polaris-Labelled__LabelWrapper')?.parentElement ||
      textFieldWrapper.firstElementChild ||
      textFieldWrapper;

    if (!labelledRoot) return;
    if (labelledRoot.querySelector(`#${TAG_ACTIONS_ID}`)) return;

    const labelWrapper = labelledRoot.querySelector('.Polaris-Labelled__LabelWrapper');
    const connected = labelledRoot.querySelector('.Polaris-Connected');

    if (!labelWrapper || !connected) return;

    const actions = document.createElement('div');
    actions.id = TAG_ACTIONS_ID;

    QUICK_TAGS.forEach((group) => {
      const row = document.createElement('div');
      row.className = TAG_GROUP_CLASS;

      group.forEach((tag) => {
        row.appendChild(
          makeQuickTagButton(tag.label, () => autofillTagSearch(tag.value), TAG_BTN_CLASS)
        );
      });

      actions.appendChild(row);
    });

    const clearRow = document.createElement('div');
    clearRow.className = TAG_GROUP_CLASS;
    clearRow.appendChild(
      makeQuickTagButton('Clear', clearTagSearch, TAG_CLEAR_CLASS)
    );
    actions.appendChild(clearRow);

    labelWrapper.insertAdjacentElement('afterend', actions);
  }

  function resetTagInlineStyles(tagNode) {
    if (!tagNode) return;

    tagNode.style.removeProperty('background');
    tagNode.style.removeProperty('background-color');
    tagNode.style.removeProperty('border-color');
    tagNode.style.removeProperty('color');

    const descendants = tagNode.querySelectorAll('.Polaris-Tag__Text, .Polaris-Text--root, .Polaris-Tag__Button, .Polaris-Tag__Icon, s-internal-icon');
    descendants.forEach((el) => {
      el.style.removeProperty('color');
      if (el.tagName?.toLowerCase() === 's-internal-icon') {
        el.style.removeProperty('--pc-icon-fill');
        el.style.removeProperty('--p-color-icon');
        el.style.removeProperty('--p-icon');
      }
    });
  }

  function paintTag(tagNode, palette) {
    if (!tagNode) return;

    tagNode.style.setProperty('background-color', palette.bg, 'important');
    tagNode.style.setProperty('border-color', palette.border, 'important');
    tagNode.style.setProperty('color', palette.text, 'important');

    const descendants = tagNode.querySelectorAll('.Polaris-Tag__Text, .Polaris-Text--root, .Polaris-Tag__Button, .Polaris-Tag__Icon, s-internal-icon');
    descendants.forEach((el) => {
      el.style.setProperty('color', palette.text, 'important');

      if (el.tagName?.toLowerCase() === 's-internal-icon') {
        el.style.setProperty('--pc-icon-fill', palette.text, 'important');
        el.style.setProperty('--p-color-icon', palette.text, 'important');
        el.style.setProperty('--p-icon', palette.text, 'important');
      }
    });
  }

  function highlightExistingTagCloud() {
    const tagsInput = document.querySelector('input[name="tags"]');
    if (!tagsInput) return;

    const organizationCard = Array.from(document.querySelectorAll('.Polaris-LegacyCard')).find((card) =>
      normalizeText(card.textContent || '').includes('Product organization')
    );

    const root = organizationCard || tagsInput.closest('.Polaris-LegacyCard') || document;
    const tagNodes = root.querySelectorAll('.Polaris-Tag.Polaris-Tag--removable');

    tagNodes.forEach((tagNode) => {
      resetTagInlineStyles(tagNode);

      const textNode = tagNode.querySelector('.Polaris-Tag__Text');
      const text = normalizeText(textNode?.textContent || tagNode.textContent || '');

      if (!text) return;

        if (text.includes('Cover not final')) {
            paintTag(tagNode, {
                bg: '#FECACA',
                border: '#EF4444',
                text: '#991B1B',
            });
            return;
        }

        if (text.includes('Class_Debut') || text.includes('Class_Standalone')) {
            paintTag(tagNode, {
                bg: '#FDE68A',
                border: '#F59E0B',
                text: '#92400E',
            });
            return;
        }

        if (text.includes('Lounge')) {
            paintTag(tagNode, {
                bg: '#86EFAC',
                border: '#22C55E',
                text: '#14532D',
            });
        }

      if (text.includes('New License')) {
            paintTag(tagNode, {
                bg: '#BFDBFE',
                border: '#3B82F6',
                text: '#1E3A8A',
    });
    return;
}
    });
  }

  function findCommonAncestor(elements) {
    const valid = elements.filter(Boolean);
    if (!valid.length) return null;

    const firstAncestors = [];
    let node = valid[0];

    while (node) {
      firstAncestors.push(node);
      node = node.parentElement;
    }

    return firstAncestors.find((ancestor) =>
      valid.every((el) => ancestor.contains(el))
    ) || null;
  }

  function getMovedInventoryWrap(handleItem) {
    let wrap = document.querySelector(`.${MOVED_WRAP_CLASS}`);

    if (!wrap && handleItem) {
      wrap = document.createElement('div');
      wrap.className = MOVED_WRAP_CLASS;
      handleItem.insertAdjacentElement('beforebegin', wrap);
    }

    return wrap;
  }

  function installSkuCopyButton(wrap) {
    if (!wrap) return;
    if (wrap.querySelector(`#${SKU_ACTIONS_ID}`)) return;

    const actions = document.createElement('div');
    actions.id = SKU_ACTIONS_ID;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Autofill SKU → Barcode + Handle';

    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const skuInput = document.querySelector('input[name="sku"]');
      const barcodeInput = getBarcodeInput();
      const handleInput = document.querySelector('input[name="handle"]');

      if (!skuInput || !handleInput) {
        console.warn('[TM] Missing SKU or handle input');
        return;
      }

      const skuValue = (skuInput.value || '').trim();
      if (!skuValue) return;

      if (barcodeInput) {
        focusAndSetInputValue(barcodeInput, skuValue);
      }

      focusAndSetInputValue(handleInput, skuValue);

      btn.textContent = 'Copied!';
      clearTimeout(btn._tmResetTimer);
      btn._tmResetTimer = setTimeout(() => {
        btn.textContent = 'Autofill SKU → Barcode + Handle';
      }, 900);
    });

    actions.appendChild(btn);
    wrap.prepend(actions);
  }

  function findSeoEditorBox() {
    const handleInput = document.querySelector('input[name="handle"]');
    if (!handleInput) return null;

    let node = handleInput;
    while (node && node !== document.body) {
      const hasHandle = !!node.querySelector?.('input[name="handle"]');
      const hasRedirect = !!node.querySelector?.('input[name="redirectNewHandle"]');
      if (hasHandle && hasRedirect) return node;
      node = node.parentElement;
    }

    return handleInput.closest('.Polaris-FormLayout, .Polaris-Box, .Polaris-LegacyCard, .Polaris-ShadowBevel, section') || null;
  }

  function getLikelyScrollableElements() {
    const els = new Set();

    if (document.scrollingElement) els.add(document.scrollingElement);
    if (document.documentElement) els.add(document.documentElement);
    if (document.body) els.add(document.body);

    const all = document.querySelectorAll('*');
    for (const el of all) {
      try {
        const style = getComputedStyle(el);
        const canScrollY =
          (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll') &&
          el.scrollHeight > el.clientHeight + 10;

        if (canScrollY) {
          els.add(el);
        }
      } catch {}
    }

    return Array.from(els);
  }

  function forceScrollEverythingToTop() {
    const scrollables = getLikelyScrollableElements();

    for (const el of scrollables) {
      try { el.scrollTop = 0; } catch {}
      try { el.scrollTo(0, 0); } catch {}
    }

    try { document.documentElement.scrollTop = 0; } catch {}
    try { document.body.scrollTop = 0; } catch {}
    try { window.scrollTo(0, 0); } catch {}
  }

  function installTopJumpButton() {
    const editorBox = findSeoEditorBox();
    if (!editorBox) return;

    let row = document.getElementById(TOP_JUMP_ROW_ID);
    if (!row) {
      row = document.createElement('div');
      row.id = TOP_JUMP_ROW_ID;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '↑ Scroll to top';

      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        forceScrollEverythingToTop();
      });

      row.appendChild(btn);
    }

    if (row.parentElement !== editorBox || row.previousElementSibling == null) {
      editorBox.appendChild(row);
    }
  }

  function moveInventoryFieldsAboveHandle() {
    const handleInput = document.querySelector('input[name="handle"]');
    const skuInput = document.querySelector('input[name="sku"]');
    const barcodeField = document.querySelector('s-internal-text-field[name="barcode"], #InventoryCardBarcode, input[name="barcode"]');

    if (!handleInput || !skuInput || !barcodeField) return;

    const handleItem = handleInput.closest('.Polaris-FormLayout__Item');
    if (!handleItem) return;

    const skuItem = skuInput.closest('.Polaris-FormLayout__Item');
    const barcodeItem = barcodeField.closest('.Polaris-FormLayout__Item');

    if (!skuItem || !barcodeItem) return;

    let fieldsRow = findCommonAncestor([skuItem, barcodeItem]);

    while (fieldsRow && fieldsRow !== document.body) {
      const directFormItems = Array.from(fieldsRow.children || []).filter(
        (child) => child.classList?.contains('Polaris-FormLayout__Item')
      );

      const containsSku = fieldsRow.contains(skuItem);
      const containsBarcode = fieldsRow.contains(barcodeItem);

      if (containsSku && containsBarcode && directFormItems.length >= 2) {
        break;
      }

      fieldsRow = fieldsRow.parentElement;
    }

    if (!fieldsRow || fieldsRow === document.body) return;
    if (fieldsRow === handleItem || fieldsRow.contains(handleItem)) return;

    const wrap = getMovedInventoryWrap(handleItem);
    if (!wrap) return;

    if (!wrap.contains(fieldsRow)) {
      wrap.appendChild(fieldsRow);
    }

    installSkuCopyButton(wrap);
  }

  function hideInventorySectionAfterMove() {
    const movedWrap = document.querySelector(`.${MOVED_WRAP_CLASS}`);
    const skuInput = document.querySelector('input[name="sku"]');

    if (!movedWrap || !skuInput) return;
    if (!movedWrap.contains(skuInput)) return;

    const collapsible = document.getElementById('product_variant_collapsible_inventory');
    const toggleButton = document.querySelector('button[aria-controls="product_variant_collapsible_inventory"]');

    if (collapsible) {
      let inventorySection =
        collapsible.closest('s-internal-section') ||
        collapsible.closest('.Polaris-LegacyCard') ||
        collapsible.parentElement;

      while (inventorySection && inventorySection !== document.body) {
        if (inventorySection.contains(movedWrap)) break;
        const text = normalizeText(inventorySection.textContent || '');
        if (text.includes('Inventory')) break;
        inventorySection = inventorySection.parentElement;
      }

      if (inventorySection && inventorySection !== document.body && !inventorySection.contains(movedWrap)) {
        markHidden(inventorySection);
      } else {
        markHidden(collapsible);
      }
    }

    if (toggleButton) {
      const toggleWrapper =
        toggleButton.closest('.Polaris-Box') ||
        toggleButton.closest('.Polaris-LegacyCard') ||
        toggleButton.parentElement;
      markHidden(toggleWrapper);
      markHidden(toggleButton);
    }

    const moreDetails = Array.from(document.querySelectorAll('a, button, span, div')).find((el) =>
      normalizeText(el.textContent) === 'More details'
    );
    if (moreDetails) {
      markHidden(moreDetails.closest('.Polaris-InlineStack') || moreDetails.parentElement);
    }
  }

  function applyTweaks() {
    if (!isProductEditPage()) return;

    addStyles();
    removeLegacyButtons();
    installDescriptionButtons();

    hidePublishingSection();
    hideSalesSection();
    hideThemeTemplateSection();
    hidePriceSection();
    hideShippingSection();
    hideVariantsSection();
    hideCategoryMetafieldsSection();
    hideVariantMetafieldsSection();
    hideCategoryPickerSection();
    hideInventoryQuantitiesSection();

    expandInventoryCollapsible();
    expandAndCleanSearchEngineListing();
    moveInventoryFieldsAboveHandle();
    hideInventorySectionAfterMove();
    installTagQuickButtons();
    highlightExistingTagCloud();
    installTopJumpButton();
  }

  function scheduleApply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(() => {
      applyTweaks();
    }, 200);
  }

  applyTweaks();

  const observer = new MutationObserver(() => {
    scheduleApply();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.addEventListener('load', scheduleApply);
  window.addEventListener('popstate', scheduleApply);
})();
