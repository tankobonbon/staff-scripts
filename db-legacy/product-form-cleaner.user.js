// ==UserScript==
// @name         Shopify Product Edit - Clean Layout + Clear Description + Tag Quick Buttons
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Lightweight cleanup for Shopify product edit page + quick tag/metafield autofill buttons + move SKU/barcode above handle + top button + trim description end spaces + tag highlights
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

(function () {
    'use strict';

    const STYLE_ID = 'tbb-product-metafield-helpers-style-v02';
    const HELPER_ATTR = 'data-tbb-metafield-helper';
    const PAGE_COUNTS = [160, 168, 176, 184, 192, 200, 208];

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function normalizeText(text) {
        return (text || '')
            .replace(/\u00A0/g, ' ')
            .replace(/[ \t\f\v]+/g, ' ')
            .replace(/\s*\n\s*/g, ' ')
            .trim();
    }

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
      .tbb-mf-helper {
        box-sizing: border-box;
        width: 100%;
        margin: 0.5rem 0 0 0;
        padding: 0.5rem;
        border: 1px solid #d4d4d4;
        border-radius: 0.5rem;
        background: #f7f7f7;
        color: #303030;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .tbb-mf-helper-title {
        margin: 0 0 0.4rem 0;
        font-size: 0.75rem;
        line-height: 1.2;
        font-weight: 650;
        color: #303030;
      }

      .tbb-mf-helper-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.375rem;
      }

      .tbb-mf-helper button {
        appearance: none;
        min-height: 1.75rem;
        border: 1px solid #8a8a8a;
        border-radius: 0.5rem;
        background: #303030;
        color: #fff;
        font-size: 0.75rem;
        font-weight: 650;
        line-height: 1.1;
        padding: 0.375rem 0.625rem;
        cursor: pointer;
        box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
      }

      .tbb-mf-helper button:hover {
        background: #1f1f1f;
      }

      .tbb-mf-helper button:disabled {
        opacity: 0.6;
        cursor: default;
      }

      .tbb-mf-helper button.tbb-secondary {
        background: #fff;
        color: #303030;
        border-color: #c9cccf;
      }

      .tbb-mf-helper button.tbb-secondary:hover {
        background: #f1f1f1;
      }

      .tbb-mf-helper input.tbb-small-input {
        box-sizing: border-box;
        width: 5.5rem;
        min-height: 1.95rem;
        border: 1px solid #8a8a8a;
        border-radius: 0.5rem;
        background: #fff;
        color: #303030;
        font-size: 0.8125rem;
        line-height: 1.2;
        padding: 0.375rem 0.5rem;
        outline: none;
      }

      .tbb-mf-helper input.tbb-small-input:focus {
        border-color: #005bd3;
        box-shadow: 0 0 0 1px #005bd3;
      }

      .tbb-mf-helper input.tbb-range {
        width: min(18rem, 100%);
        accent-color: #ffb800;
        cursor: ew-resize;
      }

      .tbb-mf-helper .tbb-status {
        min-height: 1rem;
        font-size: 0.75rem;
        color: #616161;
        font-weight: 450;
      }

      .tbb-mf-helper .tbb-pill {
        display: inline-flex;
        align-items: center;
        min-height: 1.5rem;
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
        background: #ebf5ff;
        color: #005bd3;
        font-size: 0.75rem;
        font-weight: 700;
      }
    `;

        document.head.appendChild(style);
    }

    function keepPopoverFromEatingItself(helper) {
        const stop = (e) => e.stopPropagation();
        ['pointerdown', 'mousedown', 'mouseup', 'click', 'keydown', 'keyup', 'wheel'].forEach(eventName => {
            helper.addEventListener(eventName, stop, false);
        });
    }

    function setStatus(root, message) {
        const status = root?.querySelector('.tbb-status');
        if (status) status.textContent = message || '';
    }

    function clickElement(el) {
        if (!el) return false;

        try {
            el.click();
            return true;
        } catch (_) {}

        try {
            el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
            el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            return true;
        } catch (_) {
            return false;
        }
    }

    function setReactInputValue(input, value) {
        if (!input) return false;

        const nextValue = value === null || value === undefined ? '' : String(value);
        const previousValue = input.value;

        const descriptor = Object.getOwnPropertyDescriptor(input.constructor.prototype, 'value') ||
              Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');

        input.focus();

        if (descriptor?.set) {
            descriptor.set.call(input, nextValue);
        } else {
            input.value = nextValue;
        }

        if (input._valueTracker) {
            input._valueTracker.setValue(previousValue);
        }

        try {
            input.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: nextValue
            }));
        } catch (_) {
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }

        input.dispatchEvent(new Event('change', { bubbles: true }));

        input.dispatchEvent(new KeyboardEvent('keydown', {
            bubbles: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13
        }));

        input.dispatchEvent(new KeyboardEvent('keyup', {
            bubbles: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13
        }));

        return true;
    }

    function getLabelTextForInput(input) {
        const labelledBy = input?.getAttribute('aria-labelledby');
        const label = labelledBy ? document.getElementById(labelledBy) : null;
        return normalizeText(label?.textContent || '');
    }

    function getPopoverCandidates() {
        const raw = [
            ...document.querySelectorAll('[data-polaris-layer="true"] [class*="CardPopover"]'),
            ...document.querySelectorAll('[class*="CardPopover"]'),
            ...document.querySelectorAll('[class*="PositionedOverlay"]')
        ];

        const unique = new Set();

        for (const item of raw) {
            const card = item.matches?.('[class*="CardPopover"]')
            ? item
            : item.querySelector?.('[class*="CardPopover"]') || item;

            if (!card || !card.getClientRects().length) continue;
            unique.add(card);
        }

        return [...unique].filter(el => {
            const text = normalizeText(el.innerText || el.textContent || '');
            return /\b(?:Volume|Chapters|Page Count)\b/i.test(text) && /\bInteger\b/i.test(text);
        });
    }

    function getPopoverKind(popover) {
        const text = normalizeText(popover?.innerText || popover?.textContent || '');

        if (/\bChapters\b/i.test(text) && /Integer\s*\(List\)/i.test(text)) return 'chapters';
        if (/\bPage Count\b/i.test(text) && /\bInteger\b/i.test(text) && !/Integer\s*\(List\)/i.test(text)) return 'page_count';
        if (/\bVolume\b/i.test(text) && /\bInteger\b/i.test(text) && !/Integer\s*\(List\)/i.test(text)) return 'volume';

        return '';
    }

    function getTextInputByLabel(root, labelRegex) {
        const inputs = [...root.querySelectorAll('input.Polaris-TextField__Input, input[inputmode="numeric"], input[type="text"]')];

        return inputs.find(input => labelRegex.test(getLabelTextForInput(input))) ||
            inputs.find(input => labelRegex.test(normalizeText(input.closest('[class*="Labelled"]')?.textContent || ''))) ||
            (inputs.length === 1 ? inputs[0] : null);
    }

    function getProductTitle() {
        const directInputs = [...document.querySelectorAll('input[name="title"], textarea[name="title"]')];

        for (const input of directInputs) {
            const value = normalizeText(input.value);
            if (value) return value;
        }

        const titleField = document.querySelector('s-internal-text-field[name="title"]');
        if (titleField) {
            const directValue = normalizeText(titleField.value || titleField.getAttribute('value') || '');
            if (directValue) return directValue;

            const shadowInput = titleField.shadowRoot?.querySelector('input, textarea');
            const shadowValue = normalizeText(shadowInput?.value || '');
            if (shadowValue) return shadowValue;
        }

        const headerTitle = document.querySelector('#page-title h1, .Polaris-Breadcrumbs__PageTitle h1, h1');
        return normalizeText(headerTitle?.textContent || '');
    }

    function detectVolumeFromTitle(title) {
        const clean = normalizeText(title);

        const patterns = [
            /\bVol(?!s\b)(?:ume)?\.?\s*0*(\d+)\b/i,
            /\bV\.?\s*0*(\d+)\b/i,
            /\bOmnibus\s*0*(\d+)\b/i,
            /\bBook\s*0*(\d+)\b/i,
            /(?:^|[\s-])0*(\d{1,3})\s*:/i
        ];

        for (const pattern of patterns) {
            const match = clean.match(pattern);
            if (match && Number.isFinite(Number(match[1]))) {
                return Number(match[1]);
            }
        }

        return null;
    }

    function getIntegerValue(input) {
        const value = Number.parseInt(input?.value || '0', 10);
        return Number.isFinite(value) ? value : 0;
    }

    function makeHelper(kind) {
        const helper = document.createElement('div');
        helper.className = 'tbb-mf-helper';
        helper.setAttribute(HELPER_ATTR, kind);
        keepPopoverFromEatingItself(helper);
        return helper;
    }

    function placeUnderField(input, helper) {
        const labelled = input.closest('.Polaris-Labelled--hidden') || input.closest('[class*="Labelled"]');
        const connected = input.closest('.Polaris-Connected') || input.closest('[class*="Connected"]');
        const editField = input.closest('[class*="EditField"]');
        const target = labelled || connected || editField || input.parentElement;

        if (!target) return false;

        target.appendChild(helper);
        return true;
    }

    function ensureIntegerHelper(popover, kind) {
        if (popover.querySelector(`[${HELPER_ATTR}="${kind}"]`)) return;

        const isVolume = kind === 'volume';
        const labelRegex = isVolume ? /^Volume$/i : /^Page Count$/i;
        const input = getTextInputByLabel(popover, labelRegex);
        if (!input) return;

        const helper = makeHelper(kind);

        if (isVolume) {
            const current = getIntegerValue(input);
            const sliderValue = Math.max(0, Math.min(200, current || 1));

            helper.innerHTML = `
        <div class="tbb-mf-helper-title">Volume helper</div>
        <div class="tbb-mf-helper-row">
          <button type="button" data-action="detect">Auto-detect</button>
          <button type="button" class="tbb-secondary" data-action="minus">−</button>
          <input class="tbb-range" type="range" min="0" max="200" step="1" value="${sliderValue}">
          <button type="button" class="tbb-secondary" data-action="plus">+</button>
          <span class="tbb-pill" data-current>${current || 0}</span>
          <span class="tbb-status"></span>
        </div>
      `;

            const range = helper.querySelector('.tbb-range');
            const currentPill = helper.querySelector('[data-current]');

            const syncUI = () => {
                const next = getIntegerValue(input);
                range.value = String(Math.max(0, Math.min(200, next)));
                currentPill.textContent = String(next);
            };

            const setVolume = (value, message) => {
                const safe = Math.max(0, Math.min(999, Number.parseInt(value, 10) || 0));
                setReactInputValue(input, safe);
                syncUI();
                setStatus(helper, message || `Set to ${safe}.`);
            };

            helper.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-action]');
                if (!btn) return;

                e.preventDefault();
                e.stopPropagation();

                const action = btn.dataset.action;

                if (action === 'detect') {
                    const title = getProductTitle();
                    const detected = detectVolumeFromTitle(title);

                    if (detected === null) {
                        setStatus(helper, 'No volume found in title.');
                        return;
                    }

                    setVolume(detected, `Detected ${detected}.`);
                    return;
                }

                if (action === 'minus') {
                    setVolume(getIntegerValue(input) - 1);
                    return;
                }

                if (action === 'plus') {
                    setVolume(getIntegerValue(input) + 1);
                }
            });

            range.addEventListener('input', (e) => {
                e.stopPropagation();
                setVolume(e.target.value, `Set to ${e.target.value}.`);
            });

            const wheelHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const direction = e.deltaY < 0 ? 1 : -1;
                setVolume(getIntegerValue(input) + direction);
            };

            range.addEventListener('wheel', wheelHandler, { passive: false });
            input.addEventListener('wheel', wheelHandler, { passive: false });

            input.addEventListener('input', syncUI);
            input.addEventListener('change', syncUI);

        } else {
            const clampPageCount = (value) => {
                const parsed = Number.parseInt(value, 10);
                return Math.max(0, Math.min(9999, Number.isFinite(parsed) ? parsed : 0));
            };

            const setPageCount = (value, message) => {
                const safe = clampPageCount(value);
                setReactInputValue(input, safe);
                setStatus(helper, message || `Set to ${safe}.`);
            };

            const stepPageCount = (direction) => {
                setPageCount(getIntegerValue(input) + direction);
            };

            helper.innerHTML = `
    <div class="tbb-mf-helper-title">Page count quick fill</div>
    <div class="tbb-mf-helper-row">
      ${PAGE_COUNTS.map(count => `<button type="button" class="tbb-secondary" data-page-count="${count}">${count}</button>`).join('')}
      <button type="button" class="tbb-secondary" data-action="minus">−</button>
      <button type="button" class="tbb-secondary" data-action="plus">+</button>
      <span class="tbb-status"></span>
    </div>
  `;

            helper.addEventListener('click', (e) => {
                const presetBtn = e.target.closest('button[data-page-count]');
                const actionBtn = e.target.closest('button[data-action]');

                if (!presetBtn && !actionBtn) return;

                e.preventDefault();
                e.stopPropagation();

                if (presetBtn) {
                    const count = Number(presetBtn.dataset.pageCount);
                    setPageCount(count, `Set to ${count}.`);
                    return;
                }

                if (actionBtn?.dataset.action === 'minus') {
                    stepPageCount(-1);
                    return;
                }

                if (actionBtn?.dataset.action === 'plus') {
                    stepPageCount(1);
                }
            });

            const wheelHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const direction = e.deltaY < 0 ? 1 : -1;
                stepPageCount(direction);
            };

            const keyHandler = (e) => {
                if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

                e.preventDefault();
                e.stopPropagation();

                const direction = e.key === 'ArrowUp' ? 1 : -1;
                stepPageCount(direction);
            };

            input.addEventListener('wheel', wheelHandler, { passive: false });
            input.addEventListener('keydown', keyHandler);
        }

        placeUnderField(input, helper);
    }

    function getListInputs(root, fieldName) {
        const labelRe = new RegExp(`^${fieldName}(?:\\s*-\\s*\\d+)?$`, 'i');

        return [...root.querySelectorAll('input.Polaris-TextField__Input')]
            .filter(input => {
            const label = getLabelTextForInput(input);
            const near = normalizeText(input.closest('li')?.innerText || input.closest('li')?.textContent || '');
            return labelRe.test(label) || new RegExp(`${fieldName}\\s*-\\s*\\d+`, 'i').test(near);
        });
    }

    function getAddItemButton(root) {
        const buttons = [...root.querySelectorAll('button, s-internal-button')];

        return buttons.find(btn => normalizeText(btn.textContent) === 'Add item') ||
            buttons.find(btn => /Add item/i.test(normalizeText(btn.textContent)));
    }

    function getRemoveButtonForInput(input) {
        const li = input?.closest('li');
        if (!li) return null;

        const buttons = [...li.querySelectorAll('button, s-internal-button')];

        return buttons.find(btn => /Remove Chapters/i.test(btn.getAttribute('aria-label') || btn.getAttribute('accessibilitylabel') || '')) ||
            buttons.find(btn => /Remove/i.test(normalizeText(btn.textContent || ''))) ||
            buttons[buttons.length - 1] ||
            null;
    }

    async function ensureListInputCount(root, neededCount) {
        let inputs = getListInputs(root, 'Chapters');
        const addButton = getAddItemButton(root);

        if (!addButton) {
            throw new Error('Could not find Add item.');
        }

        let guard = 0;

        while (inputs.length < neededCount && guard < 150) {
            clickElement(addButton);
            await sleep(150);
            inputs = getListInputs(root, 'Chapters');
            guard++;
        }

        return inputs;
    }

    async function trimListToCount(root, wantedCount) {
        let inputs = getListInputs(root, 'Chapters');

        for (let index = inputs.length - 1; index >= wantedCount; index--) {
            const input = inputs[index];
            const removeButton = getRemoveButtonForInput(input);

            if (removeButton) {
                clickElement(removeButton);
                await sleep(90);
            } else {
                setReactInputValue(input, '');
                await sleep(40);
            }

            inputs = getListInputs(root, 'Chapters');
        }
    }

    function buildChapterRange(first, last) {
        const start = Number.parseInt(first, 10);
        const end = Number.parseInt(last, 10);

        if (!Number.isFinite(start) || !Number.isFinite(end)) {
            throw new Error('Use whole numbers.');
        }

        if (start < 0 || end < 0) {
            throw new Error('No negative chapters, goblin.');
        }

        if (end < start) {
            throw new Error('Last must be higher than first.');
        }

        const count = end - start + 1;

        if (count > 150) {
            throw new Error('Range too huge. Max 150.');
        }

        return Array.from({ length: count }, (_, i) => start + i);
    }

    function ensureChaptersHelper(popover) {
        const kind = 'chapters';
        if (popover.querySelector(`[${HELPER_ATTR}="${kind}"]`)) return;

        const inputs = getListInputs(popover, 'Chapters');
        const addButton = getAddItemButton(popover);

        if (!inputs.length || !addButton) return;

        const controlsRow =
              addButton.closest('.Polaris-LegacyStack--distributionEqualSpacing') ||
              addButton.closest('.Polaris-LegacyStack') ||
              addButton.parentElement;

        if (!controlsRow) return;

        const helper = makeHelper(kind);
        helper.innerHTML = `
      <div class="tbb-mf-helper-title">Chapters range fill</div>
      <div class="tbb-mf-helper-row">
        <input class="tbb-small-input" data-first type="number" step="1" placeholder="First">
        <span style="font-size:0.75rem;font-weight:650;color:#616161;">to</span>
        <input class="tbb-small-input" data-last type="number" step="1" placeholder="Last">
        <button type="button" data-action="fill">Fill</button>
        <span class="tbb-status"></span>
      </div>
    `;

        helper.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-action="fill"]');
            if (!btn) return;

            e.preventDefault();
            e.stopPropagation();

            const firstInput = helper.querySelector('[data-first]');
            const lastInput = helper.querySelector('[data-last]');

            let values;

            try {
                values = buildChapterRange(firstInput.value, lastInput.value);
            } catch (error) {
                setStatus(helper, error?.message || 'Invalid range.');
                return;
            }

            btn.disabled = true;
            setStatus(helper, `Preparing ${values.length} rows...`);

            try {
                let listInputs = await ensureListInputCount(popover, values.length);

                for (let i = 0; i < values.length; i++) {
                    listInputs = getListInputs(popover, 'Chapters');
                    const input = listInputs[i];

                    if (!input) {
                        throw new Error(`Missing row ${i + 1}.`);
                    }

                    setReactInputValue(input, values[i]);
                    await sleep(55);
                }

                await trimListToCount(popover, values.length);

                setStatus(helper, `Filled ${values[0]} to ${values[values.length - 1]}.`);
            } catch (error) {
                setStatus(helper, error?.message || 'Could not fill chapters.');
            } finally {
                btn.disabled = false;
            }
        });

        controlsRow.insertAdjacentElement('afterend', helper);
    }

    function ensureHelpers() {
        ensureStyles();

        for (const popover of getPopoverCandidates()) {
            const kind = getPopoverKind(popover);

            if (kind === 'volume') ensureIntegerHelper(popover, 'volume');
            if (kind === 'page_count') ensureIntegerHelper(popover, 'page_count');
            if (kind === 'chapters') ensureChaptersHelper(popover);
        }
    }

    function boot() {
        ensureHelpers();

        const observer = new MutationObserver(() => {
            window.clearTimeout(boot._timer);
            boot._timer = window.setTimeout(ensureHelpers, 80);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    boot();
})();
