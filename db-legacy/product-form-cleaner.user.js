// ==UserScript==
// @name         Shopify Product Edit - Clean Layout + Clear Description + Tag Quick Buttons
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Lightweight cleanup for Shopify product edit page + quick tag/metafield autofill buttons + move SKU/barcode above handle + top button + trim description end spaces + tag highlights
// @match        https://admin.shopify.com/store/tankobonbon-manga-book-store/products/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/product-form-cleaner.user.js
// @downloadURL  https://github.com/tankobonbon/scripts/raw/refs/heads/main/db-legacy/product-form-cleaner.user.js
// ==/UserScript==

(() => {
    'use strict';

    const STORE_PATH = '/store/tankobonbon-manga-book-store/products/';
    const HIDDEN_ATTR = 'data-tbb-cleaner-hidden';
    const STYLE_ID = 'tbb-product-cleaner-style-v17';
    const DESCRIPTION_TOOLS_ID = 'tbb-description-tools';
    const TAG_ACTIONS_ID = 'tbb-tag-quick-actions';
    const MOVED_INVENTORY_ID = 'tbb-moved-inventory';
    const SKU_ACTIONS_ID = 'tbb-sku-copy-actions';
    const TOP_JUMP_ID = 'tbb-top-jump';
    const SEO_TOOLS_CARD_ID = 'tbb-seo-tools-card';
    const MF_HELPER_ATTR = 'data-tbb-metafield-helper';

    const QUICK_TAGS = [
        [
            { label: 'Cover not final', value: 'Cover not final' },
            { label: 'Lounge', value: 'Lounge' },
            { label: 'New License', value: 'New License' },
        ],
        [
            { label: 'Single', value: 'Volume_Single' },
            { label: 'Omnibus', value: 'Volume_Omnibus' },
        ],
        [
            { label: 'Manga', value: 'Type_Manga' },
            { label: 'Novel', value: 'Type_Novel' },
            { label: 'Manhwa', value: 'Type_Manhwa' },
        ],
        [
            { label: 'Debut', value: 'Class_Debut' },
            { label: 'Standalone', value: 'Class_Standalone' },
            { label: 'Box Set', value: 'Class_Box Set' },
            { label: 'Final Volume', value: 'Class_Final Volume' },
        ],
        [
            { label: 'Paperback', value: 'Format_Trade Paperback' },
            { label: 'Hardcover', value: 'Format_Hardcover' },
        ],
    ];

    const PAGE_COUNTS = [160, 168, 176, 184, 192, 200, 208];

    const COLLECTION_ORIGIN_ATTR = 'data-tbb-collection-origin';
    const COLLECTION_AUTOFILLED_ATTR = 'data-tbb-vendor-condition-autofilled';
    const VENDOR_ATTRIBUTE_VALUE = 'CollectionSourceInclusionConditionProductVendor';
    const STARTS_WITH_VALUE = 'STARTS_WITH';
    const EQUALS_VALUE = 'EQUALS';
    const ORIGIN_TTL_MS = 120000;

    let scheduledTimer = 0;
    let collectionAutomationBusy = false;
    let pendingMetafieldOrigin = '';
    let pendingMetafieldOriginAt = 0;
    let inventoryExpandRequestedAt = 0;
    let seoExpandRequestedAt = 0;

    const seenCollectionRoots = new WeakSet();
    const collectionOriginStack = [];

    const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

    function normalizeText(value) {
        return (value || '')
            .replace(/\u00A0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function isProductPage() {
        return location.pathname.startsWith(STORE_PATH);
    }

    function isVisible(element) {
        if (!element?.isConnected) return false;
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    async function waitFor(getValue, timeout = 3000, interval = 50) {
        const startedAt = Date.now();

        while (Date.now() - startedAt < timeout) {
            const value = getValue();
            if (value) return value;
            await sleep(interval);
        }

        return null;
    }

    function clickElement(element) {
        if (!element) return false;

        try {
            element.click();
            return true;
        } catch {}

        try {
            for (const eventName of ['mousedown', 'mouseup', 'click']) {
                element.dispatchEvent(
                    new MouseEvent(eventName, {
                        bubbles: true,
                        cancelable: true,
                        view: window,
                    })
                );
            }
            return true;
        } catch {
            return false;
        }
    }

    function getLinkedPopover(trigger) {
        const id =
            trigger?.getAttribute('commandfor') ||
            trigger?.getAttribute('aria-controls') ||
            trigger?.getAttribute('aria-owns');

        return id ? document.getElementById(id) : null;
    }

    function setNativeInputValue(input, value, { pressEnter = false } = {}) {
        if (!input) return false;

        const nextValue = value == null ? '' : String(value);
        const previousValue = input.value;

        const prototype =
            input instanceof HTMLTextAreaElement
                ? HTMLTextAreaElement.prototype
                : HTMLInputElement.prototype;

        const descriptor =
            Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value') ||
            Object.getOwnPropertyDescriptor(prototype, 'value');

        try {
            input.focus({ preventScroll: true });
        } catch {
            input.focus();
        }

        if (descriptor?.set) {
            descriptor.set.call(input, nextValue);
        } else {
            input.value = nextValue;
        }

        if (input._valueTracker) {
            input._valueTracker.setValue(previousValue);
        }

        try {
            input.dispatchEvent(
                new InputEvent('input', {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    inputType: 'insertText',
                    data: nextValue,
                })
            );
        } catch {
            input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        }

        input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

        if (pressEnter) {
            for (const eventName of ['keydown', 'keyup']) {
                input.dispatchEvent(
                    new KeyboardEvent(eventName, {
                        bubbles: true,
                        composed: true,
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                    })
                );
            }
        } else {
            input.dispatchEvent(
                new KeyboardEvent('keyup', {
                    bubbles: true,
                    key: nextValue ? nextValue.slice(-1) : 'Backspace',
                })
            );
        }

        return true;
    }

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            [${HIDDEN_ATTR}="true"] {
                display: none !important;
            }

            .Polaris-Breadcrumbs__PageTitle h1 {
                white-space: normal !important;
                overflow: visible !important;
                text-overflow: unset !important;
                word-break: break-word;
            }

            #${DESCRIPTION_TOOLS_ID},
            #${SKU_ACTIONS_ID},
            #${TAG_ACTIONS_ID} {
                display: flex;
                flex-wrap: wrap;
                gap: 0.45rem;
                align-items: center;
            }

            .Polaris-Labelled__LabelWrapper:has(#${DESCRIPTION_TOOLS_ID}) {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                gap: 0.5rem;
                width: 100%;
            }

            #${DESCRIPTION_TOOLS_ID} {
                flex: 0 0 auto;
                justify-content: flex-end;
                margin: 0;
            }

            .tbb-cleaner-btn {
                appearance: none;
                border: 1px solid #d0d5dd;
                border-radius: 0.5rem;
                background: #fff;
                color: #344054;
                padding: 0.28rem 0.65rem;
                font-size: 0.75rem;
                font-weight: 650;
                line-height: 1.2;
                cursor: pointer;
            }

            .tbb-cleaner-btn:hover {
                background: #f8fafc;
                border-color: #98a2b3;
            }

            .tbb-cleaner-btn.danger {
                color: #b42318;
            }

            .tbb-cleaner-btn.danger:hover {
                background: #fff5f5;
                border-color: #fda29b;
            }

            .tbb-cleaner-btn:disabled {
                opacity: 0.6;
                cursor: default;
            }

            #${TAG_ACTIONS_ID} {
                margin: 0.45rem 0 0.55rem;
            }

            .tbb-tag-group {
                display: flex;
                flex-wrap: wrap;
                gap: 0.45rem;
                width: 100%;
            }

            .tbb-tag-btn {
                border-style: dashed;
            }

            #${MOVED_INVENTORY_ID} {
                margin-bottom: 0.75rem;
            }

            #${SKU_ACTIONS_ID} {
                justify-content: flex-end;
                margin: 0 0 0.5rem;
            }

            #${TOP_JUMP_ID} {
                display: block;
                width: 100%;
                margin: 0.75rem 0 0.25rem;
            }

            #${TOP_JUMP_ID} button {
                width: 100%;
                border-color: #b7d7c0;
                background: #e7f6ea;
                color: #245c35;
                padding: 0.65rem 0.9rem;
                font-weight: 700;
            }

            #${TOP_JUMP_ID} button:hover {
                background: #dcf1e1;
            }

            #${SEO_TOOLS_CARD_ID} {
                box-sizing: border-box;
                width: 100%;
                padding: 1rem;
                border-radius: 0.75rem;
                background: var(--p-color-bg-surface, #fff);
                box-shadow:
                    0 0 0 1px rgba(0, 0, 0, 0.06),
                    0 1px 2px rgba(0, 0, 0, 0.04);
            }

            #${SEO_TOOLS_CARD_ID} > *:first-child {
                margin-top: 0 !important;
            }

            [data-tbb-label-tone="red"] {
                color: #ff0000 !important;
                font-weight: 700 !important;
            }

            [data-tbb-label-tone="orange"] {
                color: #ff5600 !important;
                font-weight: 700 !important;
            }

            #product-metafields-card [slot="secondary-actions"],
            #product-metafields-card .secondary-actions,
            #product-metafields-card .tbb-hide-disclosures {
                display: none !important;
            }

            s-internal-section[heading="Status"] {
                --tbb-priority-label-color: #ff0000;
            }

            s-internal-single-picker-field[label="Type"],
            s-internal-single-picker-field[label="Vendor"],
            s-internal-single-picker-field[label="Status"] {
                --tbb-priority-label-color: #ff0000;
            }

            .tbb-mf-helper {
                box-sizing: border-box;
                width: 100%;
                margin: 0.5rem 0 0;
                padding: 0.5rem;
                border: 1px solid #d4d4d4;
                border-radius: 0.5rem;
                background: #f7f7f7;
                color: #303030;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            .tbb-mf-helper-title {
                margin: 0 0 0.4rem;
                font-size: 0.75rem;
                line-height: 1.2;
                font-weight: 650;
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

            .tbb-status {
                min-height: 1rem;
                font-size: 0.75rem;
                color: #616161;
            }

            .tbb-pill {
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

            @media (min-width: 30.625em) {
                .Polaris-Page {
                    max-width: 75% !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function isUnsafeHideTarget(element) {
        if (!(element instanceof Element)) return true;

        if (
            element.matches(
                'html, body, form, #AppFrameScrollable, [data-page="product-details"], s-internal-page'
            )
        ) {
            return true;
        }

        if (
            element.matches('s-internal-page > [slot="aside"]') ||
            (element.getAttribute('slot') === 'aside' && element.closest('s-internal-page'))
        ) {
            return true;
        }

        if (
            element.parentElement?.tagName === 'S-INTERNAL-PAGE' &&
            element.classList.contains('Polaris-BlockStack')
        ) {
            return true;
        }

        return false;
    }

    function hideElement(element) {
        if (!element || isUnsafeHideTarget(element)) return false;
        element.setAttribute(HIDDEN_ATTR, 'true');
        return true;
    }

    function unhideElement(element) {
        element?.removeAttribute(HIDDEN_ATTR);
    }

    function forceHideElement(element) {
        if (!(element instanceof Element)) return;
        element.setAttribute(HIDDEN_ATTR, 'true');
        element.style.setProperty('display', 'none', 'important');
    }

    function getSectionsByHeading(text) {
        const sections = new Set();

        document
            .querySelectorAll(`s-internal-section[heading="${CSS.escape(text)}"]`)
            .forEach((section) => sections.add(section));

        document
            .querySelectorAll('s-internal-heading, h1, h2, h3, h4, h5, h6')
            .forEach((heading) => {
                if (normalizeText(heading.textContent) !== text) return;
                const section = heading.closest('s-internal-section');
                if (section) sections.add(section);
            });

        return [...sections];
    }

    function hideSectionByHeading(text) {
        const sections = getSectionsByHeading(text);

        for (const section of sections) {
            hideElement(section);
        }
    }

    function hideThemeTemplate() {
        const outer = document.querySelector(
            's-internal-section[accessibilitylabel="Theme templates"], s-internal-section[accessibilitylabel="Theme Templates"]'
        );

        if (outer) {
            forceHideElement(outer);
            return;
        }

        const inner = document.querySelector(
            's-internal-section[heading="Theme template"], s-internal-section[heading="Theme Template"]'
        );

        if (inner) {
            const parentSection = inner.parentElement?.closest?.('s-internal-section');
            forceHideElement(parentSection || inner);
            return;
        }

        const field = document.querySelector(
            's-internal-single-picker-field[label="Theme template"], s-internal-single-picker-field[label="Theme Template"]'
        );

        if (field) {
            const section = field.closest('s-internal-section');
            const parentSection = section?.parentElement?.closest?.('s-internal-section');
            forceHideElement(parentSection || section || field);
        }
    }

    function hideCategoryPicker() {
        const anchor = document.getElementById('ProductCategoryPickerAnchor');
        const item = anchor?.closest('.Polaris-FormLayout__Item');
        hideElement(item);
    }

    function hideCategoryMetafields() {
        hideElement(document.getElementById('constrained-metafields-anchor'));
    }

    function hideVariantMetafields() {
        hideSectionByHeading('Variant metafields');
    }

    function hideInventoryQuantities() {
        const historyLink = document.querySelector(
            's-internal-link[href*="/inventory_history"], a[href*="/inventory_history"]'
        );

        if (!historyLink) return;

        hideElement(
            historyLink.closest('.Polaris-FormLayout__Item') ||
            historyLink.closest('.Polaris-BlockStack')
        );
    }

    function cleanVisibleSections() {
        for (const name of ['Publishing', 'Sales', 'Price', 'Shipping', 'Variants']) {
            hideSectionByHeading(name);
        }

        hideThemeTemplate();
        hideCategoryPicker();
        hideCategoryMetafields();
        hideVariantMetafields();
        hideInventoryQuantities();
    }

    function findDescriptionIframe() {
        for (const iframe of document.querySelectorAll('iframe')) {
            try {
                if (iframe.contentDocument?.querySelector('body#tinymce')) {
                    return iframe;
                }
            } catch {}
        }

        return null;
    }

    function dispatchEditorChangeSignals(doc, body) {
        body.dispatchEvent(new Event('input', { bubbles: true }));
        body.dispatchEvent(new Event('change', { bubbles: true }));
        body.dispatchEvent(
            new KeyboardEvent('keyup', {
                bubbles: true,
                key: 'Backspace',
            })
        );
        doc.dispatchEvent(new Event('input', { bubbles: true }));
        doc.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function clearDescription() {
        const iframe = findDescriptionIframe();
        const doc = iframe?.contentDocument;
        const body = doc?.querySelector('body#tinymce');
        if (!iframe || !doc || !body) return;

        try {
            iframe.focus();
            body.focus();
            body.innerHTML = '<p><br data-mce-bogus="1"></p>';
            dispatchEditorChangeSignals(doc, body);
            body.blur();
            iframe.blur();
        } catch (error) {
            console.error('[TBB] Failed to clear description:', error);
        }
    }

    function isIgnorableTrailingNode(node) {
        if (!node) return true;
        if (node.nodeType === Node.COMMENT_NODE) return true;

        if (node.nodeType === Node.TEXT_NODE) {
            return !node.nodeValue || /^[\s\u00A0]*$/.test(node.nodeValue);
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName?.toLowerCase() === 'br') return true;

            if (!node.childNodes.length) {
                return /^[\s\u00A0]*$/.test(node.textContent || '');
            }

            return [...node.childNodes].every(isIgnorableTrailingNode);
        }

        return false;
    }

    function trimTrailingWhitespaceNodes(node) {
        if (!node?.childNodes) return;

        while (node.lastChild && isIgnorableTrailingNode(node.lastChild)) {
            node.removeChild(node.lastChild);
        }

        const last = node.lastChild;
        if (!last) return;

        if (last.nodeType === Node.TEXT_NODE) {
            last.nodeValue = (last.nodeValue || '').replace(/[\s\u00A0]+$/g, '');
            if (!last.nodeValue) node.removeChild(last);
            return;
        }

        if (last.nodeType === Node.ELEMENT_NODE) {
            trimTrailingWhitespaceNodes(last);
            if (isIgnorableTrailingNode(last)) node.removeChild(last);
        }
    }

    function trimDescriptionEnd() {
        const iframe = findDescriptionIframe();
        const doc = iframe?.contentDocument;
        const body = doc?.querySelector('body#tinymce');
        if (!iframe || !doc || !body) return;

        try {
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
            console.error('[TBB] Failed to trim description:', error);
        }
    }

    function makeButton(text, onClick, className = '') {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `tbb-cleaner-btn ${className}`.trim();
        button.textContent = text;

        button.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            button.disabled = true;
            try {
                await onClick();
            } finally {
                button.disabled = false;
            }
        });

        return button;
    }

    function installDescriptionTools() {
        const iframe = findDescriptionIframe();
        if (!iframe) return;

        const richTextRoot =
            iframe.closest('[class*="_RichTextEditor_"]') ||
            iframe.closest('.Polaris-FormLayout__Item') ||
            iframe.parentElement;

        if (!richTextRoot) return;

        const labelWrapper =
            richTextRoot.querySelector(
                '.Polaris-Labelled__LabelWrapper:has(label[for="product-description-rt"])'
            ) ||
            [...richTextRoot.querySelectorAll('.Polaris-Labelled__LabelWrapper')]
                .find((element) => normalizeText(element.textContent) === 'Description');

        if (!labelWrapper) return;

        let tools = document.getElementById(DESCRIPTION_TOOLS_ID);

        if (!tools) {
            tools = document.createElement('div');
            tools.id = DESCRIPTION_TOOLS_ID;
            tools.append(
                makeButton('Trim', trimDescriptionEnd),
                makeButton('Clear', clearDescription, 'danger')
            );
        }

        if (tools.parentElement !== labelWrapper) {
            labelWrapper.appendChild(tools);
        }
    }

    const RED_PRIORITY_LABELS = new Set([
        'Title',
        'Description',
        'Media',
        'Type',
        'Vendor',
        'Tags',
        'Status',
        'Page Count',
        'Series',
        'Volume',
        'Preview',
        'Release Date',
        'SKU',
        'SKU (Stock Keeping Unit)',
        'Barcode',
        'Barcode (ISBN, UPC, GTIN, etc.)',
        'URL handle',
    ]);

    const ORANGE_PRIORITY_LABELS = new Set([
        'Genres',
        'Author',
        'Romanized title',
        'Japanese/Original title',
        'Demography',
        'Imprint',
        'Publisher',
    ]);

    function hideProductMetafieldChrome() {
        const root = document.getElementById('product-metafields-card');
        if (!root) return;

        const section = root.querySelector(
            's-internal-section[heading="Product metafields"]'
        );

        if (!section) return;

        for (const actions of section.querySelectorAll(
            ':scope > [slot="secondary-actions"]'
        )) {
            const button = actions.querySelector('s-internal-button, button');

            if (button && normalizeText(button.textContent) === 'Add definition') {
                forceHideElement(actions);
                forceHideElement(button);
            }
        }

        if (section.shadowRoot) {
            for (const button of section.shadowRoot.querySelectorAll(
                's-internal-button, button'
            )) {
                if (normalizeText(button.textContent) !== 'Add definition') continue;

                forceHideElement(button);

                const actions = button.closest('.secondary-actions');

                if (actions instanceof Element) {
                    actions.style.setProperty('display', 'none', 'important');
                }
            }
        }

        const disclosuresButton = [...section.querySelectorAll('button')]
            .find((button) =>
                normalizeText(button.textContent).replace(/^\+\s*/, '') === 'Disclosures'
            );

        if (disclosuresButton) {
            const target =
                disclosuresButton.closest('.Polaris-Bleed') ||
                disclosuresButton.closest('.Polaris-Tooltip__TooltipContainer') ||
                disclosuresButton.parentElement ||
                disclosuresButton;

            forceHideElement(target);
        }
    }

    function getPriorityTone(labelText) {
        if (RED_PRIORITY_LABELS.has(labelText)) return 'red';
        if (ORANGE_PRIORITY_LABELS.has(labelText)) return 'orange';
        return '';
    }

    function markPriorityLabelElement(element, tone) {
        if (!(element instanceof Element) || !tone) return;

        const color = tone === 'red' ? '#ff0000' : '#ff5600';

        element.setAttribute('data-tbb-label-tone', tone);
        element.style.setProperty('color', color, 'important');
        element.style.setProperty('font-weight', '700', 'important');

        for (const child of element.querySelectorAll(
            'label, p, span, div, s-internal-text, s-internal-heading, s-internal-paragraph'
        )) {
            const childText = normalizeText(child.textContent);
            if (getPriorityTone(childText) === tone) {
                child.setAttribute('data-tbb-label-tone', tone);
                child.style.setProperty('color', color, 'important');
                child.style.setProperty('font-weight', '700', 'important');
            }
        }
    }

    function stylePriorityTextInRoot(root) {
        if (!root?.querySelectorAll) return;

        const candidates = root.querySelectorAll(
            'label, p, span, div, s-internal-text, s-internal-heading, s-internal-paragraph'
        );

        for (const element of candidates) {
            const textValue = normalizeText(element.textContent);
            const tone = getPriorityTone(textValue);
            if (!tone) continue;

            const hasMatchingChild = [...element.children].some((child) => {
                const childText = normalizeText(child.textContent);
                return getPriorityTone(childText) === tone;
            });

            if (!hasMatchingChild) {
                markPriorityLabelElement(element, tone);
            }
        }

        for (const host of root.querySelectorAll('*')) {
            if (host.shadowRoot) {
                stylePriorityTextInRoot(host.shadowRoot);
            }
        }
    }

    function stylePriorityLabels() {
        const root =
            document.querySelector('[data-page="product-details"]') ||
            document;

        stylePriorityTextInRoot(root);

        for (const label of root.querySelectorAll(
            '#product-metafields-card label'
        )) {
            const labelText = normalizeText(label.textContent);
            const tone = getPriorityTone(labelText);
            if (tone) markPriorityLabelElement(label, tone);
        }

        const explicitHosts = root.querySelectorAll(
            's-internal-text-field[name="title"], ' +
            's-internal-single-picker-field[label="Type"], ' +
            's-internal-single-picker-field[label="Vendor"], ' +
            's-internal-multi-picker-field[label="Tags"], ' +
            's-internal-single-picker-field[label="Status"], ' +
            's-internal-text-field[name="barcode"], ' +
            '#InventoryCardBarcode'
        );

        for (const host of explicitHosts) {
            host.style.setProperty('color', '#ff0000', 'important');
            host.style.setProperty('font-weight', '700', 'important');

            if (host.shadowRoot) {
                stylePriorityTextInRoot(host.shadowRoot);
            }
        }

        const descriptionLabel = root.querySelector(
            'label[for="product-description-rt"]'
        );

        if (descriptionLabel) {
            markPriorityLabelElement(descriptionLabel, 'red');
        }

        const mediaParagraph = [...root.querySelectorAll('s-internal-paragraph')]
            .find((element) => normalizeText(element.textContent) === 'Media');

        if (mediaParagraph) {
            const mediaParent = mediaParagraph.parentElement;

            if (mediaParent) {
                forceHideElement(mediaParagraph);

                let replacement = mediaParent.querySelector('[data-tbb-media-label="true"]');

                if (!replacement) {
                    replacement = document.createElement('span');
                    replacement.setAttribute('data-tbb-media-label', 'true');
                    replacement.textContent = 'Media';
                    mediaParent.prepend(replacement);
                }

                replacement.style.setProperty('color', '#ff0000', 'important');
                replacement.style.setProperty('font-weight', '700', 'important');
            }
        }

        const statusSection = root.querySelector(
            's-internal-section[heading="Status"], s-internal-section[accessibilitylabel="Status"]'
        );

        if (statusSection) {
            if (statusSection.getAttribute('heading') === 'Status') {
                statusSection.setAttribute('accessibilitylabel', 'Status');
                statusSection.removeAttribute('heading');
            }

            let statusLabel = statusSection.querySelector('[data-tbb-status-label="true"]');

            if (!statusLabel) {
                statusLabel = document.createElement('div');
                statusLabel.setAttribute('data-tbb-status-label', 'true');
                statusLabel.textContent = 'Status';
                statusSection.prepend(statusLabel);
            }

            statusLabel.style.setProperty('color', '#ff0000', 'important');
            statusLabel.style.setProperty('font-weight', '700', 'important');
            statusLabel.style.setProperty('margin-bottom', '0.5rem', 'important');
        }
    }

    function findHeading(text) {
        return [...document.querySelectorAll('s-internal-heading, h1, h2, h3, h4, h5, h6')]
            .find((el) => normalizeText(el.textContent) === text);
    }

    function keepOnlySeoEditorControls() {
        const handleInput = document.querySelector('input[name="handle"]');
        if (!handleInput) return false;

        const seoRoot = document.getElementById('seo');
        if (!seoRoot) return false;

        const editorBox = findSeoEditorBox();
        if (!editorBox) return false;

        let toolsCard = document.getElementById(SEO_TOOLS_CARD_ID);

        if (!toolsCard) {
            toolsCard = document.createElement('div');
            toolsCard.id = SEO_TOOLS_CARD_ID;

            seoRoot.insertAdjacentElement('afterend', toolsCard);
        }

        if (!toolsCard.contains(editorBox)) {
            toolsCard.appendChild(editorBox);
        }

        hideElement(seoRoot);

        return true;
    }

    function expandSearchEngineListing() {
        const handleInput = document.querySelector('input[name="handle"]');

        if (handleInput) {
            seoExpandRequestedAt = 0;

            hideElement(
                document
                    .querySelector('input[name="seoTitle"]')
                    ?.closest('.Polaris-FormLayout__Item')
            );

            hideElement(
                document
                    .querySelector('textarea[name="seoDescription"]')
                    ?.closest('.Polaris-FormLayout__Item')
            );

            let editorBox = handleInput.parentElement;

            while (editorBox && editorBox !== document.body) {
                const hasHandle = !!editorBox.querySelector?.('input[name="handle"]');
                const hasRedirect = !!editorBox.querySelector?.(
                    'input[name="redirectNewHandle"]'
                );

                if (hasHandle && hasRedirect) break;
                editorBox = editorBox.parentElement;
            }

            const divider = editorBox?.previousElementSibling;
            if (divider?.tagName === 'S-DIVIDER') hideElement(divider);

            keepOnlySeoEditorControls();

            return;
        }

        if (Date.now() - seoExpandRequestedAt < 900) return;

        const seoSection =
            document.querySelector(
                '#seo s-internal-section[heading="Search engine listing"]'
            ) ||
            document.querySelector('s-internal-section[heading="Search engine listing"]');

        const editButton =
            seoSection?.querySelector(
                's-internal-button[accessibilitylabel="Edit"], s-internal-button[icon="edit"], button[aria-label="Edit"]'
            ) ||
            document.querySelector(
                '#seo s-internal-button[accessibilitylabel="Edit"], #seo s-internal-button[icon="edit"], #seo button[aria-label="Edit"]'
            );

        if (!editButton) return;

        seoExpandRequestedAt = Date.now();
        clickElement(editButton);
    }

    function inventoryFieldsReady() {
        const skuInput = document.querySelector('input[name="sku"]');
        const barcodeField = document.querySelector(
            'input[name="barcode"], s-internal-text-field[name="barcode"], #InventoryCardBarcode'
        );

        return Boolean(skuInput && barcodeField);
    }

    function expandInventoryDetails() {
        if (inventoryFieldsReady()) {
            inventoryExpandRequestedAt = 0;
            return;
        }

        if (Date.now() - inventoryExpandRequestedAt < 900) return;

        const collapsible = document.getElementById(
            'product_variant_collapsible_inventory'
        );

        const toggleButton =
            document.querySelector(
                'button[aria-controls="product_variant_collapsible_inventory"]'
            ) ||
            document.querySelector(
                'button._CollapsibleButton_1kcox_1[aria-controls="product_variant_collapsible_inventory"]'
            );

        const looksClosed =
            toggleButton?.getAttribute('aria-expanded') === 'false' ||
            collapsible?.getAttribute('aria-hidden') === 'true' ||
            collapsible?.classList.contains('Polaris-Collapsible--isFullyClosed');

        if (toggleButton && (looksClosed || !collapsible)) {
            inventoryExpandRequestedAt = Date.now();
            clickElement(toggleButton);
            return;
        }

        const inventorySection =
            document.querySelector('s-internal-section[heading="Inventory"]') ||
            [...document.querySelectorAll('s-internal-section')].find((section) =>
                normalizeText(section.getAttribute('heading')) === 'Inventory'
            );

        if (!inventorySection) return;

        const pill = [
            ...inventorySection.querySelectorAll(
                'button, [role="button"], .Polaris-Tag, s-internal-button'
            ),
        ].find((element) => {
            const label = normalizeText(
                element.getAttribute?.('aria-label') ||
                element.getAttribute?.('accessibilitylabel') ||
                element.textContent
            );

            return label === 'SKU' || label === 'Barcode';
        });

        if (!pill) return;

        inventoryExpandRequestedAt = Date.now();
        clickElement(pill);
    }

    function getBarcodeInput() {
        const direct = document.querySelector('input[name="barcode"]');
        if (direct) return direct;

        const host = document.querySelector(
            's-internal-text-field[name="barcode"], #InventoryCardBarcode'
        );

        return (
            host?.querySelector('input, textarea') ||
            host?.shadowRoot?.querySelector?.('input, textarea') ||
            null
        );
    }

    function findCommonAncestor(elements) {
        const valid = elements.filter(Boolean);
        if (!valid.length) return null;

        const ancestors = [];
        let node = valid[0];

        while (node) {
            ancestors.push(node);
            node = node.parentElement;
        }

        return (
            ancestors.find((ancestor) =>
                valid.every((element) => ancestor.contains(element))
            ) || null
        );
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

        return handleInput.closest(
            '.Polaris-FormLayout, .Polaris-Box, .Polaris-LegacyCard, .Polaris-ShadowBevel, section'
        );
    }

    function installSkuCopyButton(wrap) {
        if (!wrap || document.getElementById(SKU_ACTIONS_ID)) return;

        const actions = document.createElement('div');
        actions.id = SKU_ACTIONS_ID;

        const button = makeButton('Autofill SKU → Barcode + Handle', () => {
            const skuInput = document.querySelector('input[name="sku"]');
            const barcodeInput = getBarcodeInput();
            const handleInput = document.querySelector('input[name="handle"]');

            if (!skuInput || !handleInput) {
                console.warn('[TBB] Missing SKU or handle input.');
                return;
            }

            const sku = normalizeText(skuInput.value);
            if (!sku) return;

            if (barcodeInput) setNativeInputValue(barcodeInput, sku);
            setNativeInputValue(handleInput, sku);

            button.textContent = 'Copied!';
            window.clearTimeout(button._resetTimer);
            button._resetTimer = window.setTimeout(() => {
                button.textContent = 'Autofill SKU → Barcode + Handle';
            }, 900);
        });

        actions.appendChild(button);
        wrap.prepend(actions);
    }

    function moveInventoryFieldsAboveHandle() {
        const handleInput = document.querySelector('input[name="handle"]');
        const skuInput = document.querySelector('input[name="sku"]');
        const barcodeField = document.querySelector(
            's-internal-text-field[name="barcode"], #InventoryCardBarcode, input[name="barcode"]'
        );

        if (!handleInput || !skuInput || !barcodeField) return;

        const handleItem = handleInput.closest('.Polaris-FormLayout__Item');
        const skuItem = skuInput.closest('.Polaris-FormLayout__Item');
        const barcodeItem = barcodeField.closest('.Polaris-FormLayout__Item');

        if (!handleItem || !skuItem || !barcodeItem) return;

        let fieldsRow = findCommonAncestor([skuItem, barcodeItem]);

        while (fieldsRow && fieldsRow !== document.body) {
            const directFormItems = [...(fieldsRow.children || [])].filter((child) =>
                child.classList?.contains('Polaris-FormLayout__Item')
            );

            if (
                fieldsRow.contains(skuItem) &&
                fieldsRow.contains(barcodeItem) &&
                directFormItems.length >= 2
            ) {
                break;
            }

            fieldsRow = fieldsRow.parentElement;
        }

        if (!fieldsRow || fieldsRow === document.body) return;
        if (fieldsRow === handleItem || fieldsRow.contains(handleItem)) return;

        let wrap = document.getElementById(MOVED_INVENTORY_ID);
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.id = MOVED_INVENTORY_ID;
            handleItem.insertAdjacentElement('beforebegin', wrap);
        }

        if (!wrap.contains(fieldsRow)) wrap.appendChild(fieldsRow);

        installSkuCopyButton(wrap);
    }

    function hideOriginalInventoryAfterMove() {
        const wrap = document.getElementById(MOVED_INVENTORY_ID);
        const skuInput = document.querySelector('input[name="sku"]');

        if (!wrap || !skuInput || !wrap.contains(skuInput)) return;

        const collapsible = document.getElementById('product_variant_collapsible_inventory');
        const toggleButton = document.querySelector(
            'button[aria-controls="product_variant_collapsible_inventory"]'
        );

        if (collapsible) {
            let section =
                collapsible.closest('s-internal-section') ||
                collapsible.closest('.Polaris-LegacyCard') ||
                collapsible.parentElement;

            if (section && !section.contains(wrap)) {
                hideElement(section);
            } else {
                hideElement(collapsible);
            }
        }

        if (toggleButton) {
            hideElement(toggleButton);
        }

        const moreDetails = [...document.querySelectorAll('a, button, span, div')]
            .find((el) => normalizeText(el.textContent) === 'More details');

        hideElement(
            moreDetails?.closest('.Polaris-InlineStack') ||
            moreDetails?.parentElement
        );
    }

    function installTopJumpButton() {
        if (document.getElementById(TOP_JUMP_ID)) return;

        const editorBox = findSeoEditorBox();
        if (!editorBox) return;

        const row = document.createElement('div');
        row.id = TOP_JUMP_ID;

        row.appendChild(
            makeButton('↑ Scroll to top', () => {
                const scrollContainer =
                    document.getElementById('AppFrameScrollable') ||
                    document.scrollingElement ||
                    document.documentElement;

                try {
                    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                } catch {
                    scrollContainer.scrollTop = 0;
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
            })
        );

        editorBox.appendChild(row);
    }

    function findTagInput() {
        return document.querySelector('input[name="tags"]');
    }

    function openTagInput(input) {
        if (!input) return;

        try {
            input.focus({ preventScroll: true });
        } catch {
            input.focus();
        }

        clickElement(input);
    }

    function fillTagSearch(tagText) {
        const input = findTagInput();
        if (!input) return;

        openTagInput(input);

        requestAnimationFrame(() => {
            setNativeInputValue(input, tagText);
            requestAnimationFrame(() => openTagInput(input));
        });
    }

    function clearTagSearch() {
        const input = findTagInput();
        if (!input) return;

        openTagInput(input);

        requestAnimationFrame(() => {
            setNativeInputValue(input, '');
            requestAnimationFrame(() => openTagInput(input));
        });
    }

    function installTagQuickButtons() {
        if (document.getElementById(TAG_ACTIONS_ID)) return;

        const input = findTagInput();
        if (!input) return;

        const wrapper =
            input.closest('.TextFieldWrapper') ||
            input.closest('.Polaris-FormLayout__Item') ||
            input.parentElement;

        if (!wrapper) return;

        const labelWrapper =
            wrapper.querySelector('.Polaris-Labelled__LabelWrapper') ||
            wrapper.querySelector('label');

        if (!labelWrapper) return;

        const actions = document.createElement('div');
        actions.id = TAG_ACTIONS_ID;

        for (const group of QUICK_TAGS) {
            const row = document.createElement('div');
            row.className = 'tbb-tag-group';

            for (const tag of group) {
                const button = makeButton(
                    tag.label,
                    () => fillTagSearch(tag.value),
                    'tbb-tag-btn'
                );
                row.appendChild(button);
            }

            actions.appendChild(row);
        }

        const clearRow = document.createElement('div');
        clearRow.className = 'tbb-tag-group';
        clearRow.appendChild(
            makeButton('Clear', clearTagSearch, 'tbb-tag-btn danger')
        );
        actions.appendChild(clearRow);

        labelWrapper.insertAdjacentElement('afterend', actions);
    }

    const TAG_PALETTES = [
        {
            test: (text) => text.includes('Cover not final'),
            bg: '#FECACA',
            border: '#EF4444',
            text: '#991B1B',
        },
        {
            test: (text) =>
                text.includes('Class_Debut') || text.includes('Class_Standalone'),
            bg: '#FDE68A',
            border: '#F59E0B',
            text: '#92400E',
        },
        {
            test: (text) => text.includes('Lounge'),
            bg: '#86EFAC',
            border: '#22C55E',
            text: '#14532D',
        },
        {
            test: (text) => text.includes('New License'),
            bg: '#BFDBFE',
            border: '#3B82F6',
            text: '#1E3A8A',
        },
    ];

    function paintTag(tagNode, palette) {
        tagNode.style.setProperty('background-color', palette.bg, 'important');
        tagNode.style.setProperty('border-color', palette.border, 'important');
        tagNode.style.setProperty('color', palette.text, 'important');

        tagNode
            .querySelectorAll(
                '.Polaris-Tag__Text, .Polaris-Text--root, .Polaris-Tag__Button, .Polaris-Tag__Icon, s-internal-icon'
            )
            .forEach((element) => {
                element.style.setProperty('color', palette.text, 'important');
                if (element.tagName?.toLowerCase() === 's-internal-icon') {
                    element.style.setProperty('--pc-icon-fill', palette.text, 'important');
                    element.style.setProperty('--p-color-icon', palette.text, 'important');
                    element.style.setProperty('--p-icon', palette.text, 'important');
                }
            });
    }

    function highlightExistingTags() {
        for (const tagNode of document.querySelectorAll(
            '.Polaris-Tag.Polaris-Tag--removable'
        )) {
            const text = normalizeText(
                tagNode.querySelector('.Polaris-Tag__Text')?.textContent ||
                tagNode.textContent
            );

            const palette = TAG_PALETTES.find((entry) => entry.test(text));
            if (palette) paintTag(tagNode, palette);
        }
    }

    function keepPopoverFromEatingHelper(helper) {
        const stop = (event) => event.stopPropagation();

        for (const eventName of [
            'pointerdown',
            'mousedown',
            'mouseup',
            'click',
            'keydown',
            'keyup',
            'wheel',
        ]) {
            helper.addEventListener(eventName, stop, false);
        }
    }

    function setHelperStatus(root, message) {
        const status = root?.querySelector('.tbb-status');
        if (status) status.textContent = message || '';
    }

    function getLabelTextForInput(input) {
        const labelledBy = input?.getAttribute('aria-labelledby');
        const label = labelledBy ? document.getElementById(labelledBy) : null;
        return normalizeText(label?.textContent);
    }

    function getMetafieldPopovers() {
        const raw = [
            ...document.querySelectorAll(
                '[data-polaris-layer="true"] [class*="CardPopover"]'
            ),
            ...document.querySelectorAll('[class*="CardPopover"]'),
            ...document.querySelectorAll('[class*="PositionedOverlay"]'),
        ];

        const unique = new Set();

        for (const item of raw) {
            const card = item.matches?.('[class*="CardPopover"]')
                ? item
                : item.querySelector?.('[class*="CardPopover"]') || item;

            if (!card || !card.getClientRects().length) continue;
            unique.add(card);
        }

        return [...unique].filter((element) => {
            const text = normalizeText(element.innerText || element.textContent);
            return /\b(?:Volume|Chapters|Page Count)\b/i.test(text) &&
                /\bInteger\b/i.test(text);
        });
    }

    function getMetafieldKind(popover) {
        const text = normalizeText(popover?.innerText || popover?.textContent);

        if (/\bChapters\b/i.test(text) && /Integer\s*\(List\)/i.test(text)) {
            return 'chapters';
        }

        if (
            /\bPage Count\b/i.test(text) &&
            /\bInteger\b/i.test(text) &&
            !/Integer\s*\(List\)/i.test(text)
        ) {
            return 'page_count';
        }

        if (
            /\bVolume\b/i.test(text) &&
            /\bInteger\b/i.test(text) &&
            !/Integer\s*\(List\)/i.test(text)
        ) {
            return 'volume';
        }

        return '';
    }

    function getTextInputByLabel(root, labelRegex) {
        const inputs = [
            ...root.querySelectorAll(
                'input.Polaris-TextField__Input, input[inputmode="numeric"], input[type="text"]'
            ),
        ];

        return (
            inputs.find((input) => labelRegex.test(getLabelTextForInput(input))) ||
            inputs.find((input) =>
                labelRegex.test(
                    normalizeText(input.closest('[class*="Labelled"]')?.textContent)
                )
            ) ||
            (inputs.length === 1 ? inputs[0] : null)
        );
    }

    function getProductTitle() {
        for (const input of document.querySelectorAll(
            'input[name="title"], textarea[name="title"]'
        )) {
            const value = normalizeText(input.value);
            if (value) return value;
        }

        const titleField = document.querySelector(
            's-internal-text-field[name="title"]'
        );

        if (titleField) {
            const direct = normalizeText(
                titleField.value || titleField.getAttribute('value')
            );
            if (direct) return direct;

            const shadowValue = normalizeText(
                titleField.shadowRoot?.querySelector('input, textarea')?.value
            );
            if (shadowValue) return shadowValue;
        }

        return normalizeText(
            document.querySelector(
                '#page-title h1, .Polaris-Breadcrumbs__PageTitle h1, h1'
            )?.textContent
        );
    }

    function detectVolumeFromTitle(title) {
        const clean = normalizeText(title);

        const patterns = [
            /\bVol(?!s\b)(?:ume)?\.?\s*0*(\d+)\b/i,
            /\bV\.?\s*0*(\d+)\b/i,
            /\bOmnibus\s*0*(\d+)\b/i,
            /\bBook\s*0*(\d+)\b/i,
            /(?:^|[\s-])0*(\d{1,3})\s*:/i,
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

    function makeMetafieldHelper(kind) {
        const helper = document.createElement('div');
        helper.className = 'tbb-mf-helper';
        helper.setAttribute(MF_HELPER_ATTR, kind);
        keepPopoverFromEatingHelper(helper);
        return helper;
    }

    function placeHelperUnderField(input, helper) {
        const target =
            input.closest('.Polaris-Labelled--hidden') ||
            input.closest('[class*="Labelled"]') ||
            input.closest('.Polaris-Connected') ||
            input.closest('[class*="Connected"]') ||
            input.closest('[class*="EditField"]') ||
            input.parentElement;

        if (!target) return false;
        target.appendChild(helper);
        return true;
    }

    function ensureIntegerHelper(popover, kind) {
        if (popover.querySelector(`[${MF_HELPER_ATTR}="${kind}"]`)) return;

        const isVolume = kind === 'volume';
        const input = getTextInputByLabel(
            popover,
            isVolume ? /^Volume$/i : /^Page Count$/i
        );

        if (!input) return;

        const helper = makeMetafieldHelper(kind);

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

            const syncUi = () => {
                const next = getIntegerValue(input);
                range.value = String(Math.max(0, Math.min(200, next)));
                currentPill.textContent = String(next);
            };

            const setVolume = (value, message) => {
                const safe = Math.max(
                    0,
                    Math.min(999, Number.parseInt(value, 10) || 0)
                );

                setNativeInputValue(input, safe, { pressEnter: true });
                syncUi();
                setHelperStatus(helper, message || `Set to ${safe}.`);
            };

            helper.addEventListener('click', (event) => {
                const button = event.target.closest('button[data-action]');
                if (!button) return;

                event.preventDefault();
                event.stopPropagation();

                if (button.dataset.action === 'detect') {
                    const detected = detectVolumeFromTitle(getProductTitle());

                    if (detected == null) {
                        setHelperStatus(helper, 'No volume found in title.');
                    } else {
                        setVolume(detected, `Detected ${detected}.`);
                    }
                    return;
                }

                if (button.dataset.action === 'minus') {
                    setVolume(getIntegerValue(input) - 1);
                    return;
                }

                if (button.dataset.action === 'plus') {
                    setVolume(getIntegerValue(input) + 1);
                }
            });

            range.addEventListener('input', (event) => {
                event.stopPropagation();
                setVolume(event.target.value, `Set to ${event.target.value}.`);
            });

            const wheelHandler = (event) => {
                event.preventDefault();
                event.stopPropagation();
                setVolume(getIntegerValue(input) + (event.deltaY < 0 ? 1 : -1));
            };

            range.addEventListener('wheel', wheelHandler, { passive: false });
            input.addEventListener('wheel', wheelHandler, { passive: false });
            input.addEventListener('input', syncUi);
            input.addEventListener('change', syncUi);
        } else {
            const clamp = (value) => {
                const parsed = Number.parseInt(value, 10);
                return Math.max(
                    0,
                    Math.min(9999, Number.isFinite(parsed) ? parsed : 0)
                );
            };

            const setPageCount = (value, message) => {
                const safe = clamp(value);
                setNativeInputValue(input, safe, { pressEnter: true });
                setHelperStatus(helper, message || `Set to ${safe}.`);
            };

            helper.innerHTML = `
                <div class="tbb-mf-helper-title">Page count quick fill</div>
                <div class="tbb-mf-helper-row">
                    ${PAGE_COUNTS.map(
                        (count) =>
                            `<button type="button" class="tbb-secondary" data-page-count="${count}">${count}</button>`
                    ).join('')}
                    <button type="button" class="tbb-secondary" data-action="minus">−</button>
                    <button type="button" class="tbb-secondary" data-action="plus">+</button>
                    <span class="tbb-status"></span>
                </div>
            `;

            helper.addEventListener('click', (event) => {
                const preset = event.target.closest('button[data-page-count]');
                const action = event.target.closest('button[data-action]');
                if (!preset && !action) return;

                event.preventDefault();
                event.stopPropagation();

                if (preset) {
                    const count = Number(preset.dataset.pageCount);
                    setPageCount(count, `Set to ${count}.`);
                    return;
                }

                setPageCount(
                    getIntegerValue(input) +
                    (action.dataset.action === 'plus' ? 1 : -1)
                );
            });

            const wheelHandler = (event) => {
                event.preventDefault();
                event.stopPropagation();
                setPageCount(
                    getIntegerValue(input) + (event.deltaY < 0 ? 1 : -1)
                );
            };

            const keyHandler = (event) => {
                if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;

                event.preventDefault();
                event.stopPropagation();

                setPageCount(
                    getIntegerValue(input) + (event.key === 'ArrowUp' ? 1 : -1)
                );
            };

            input.addEventListener('wheel', wheelHandler, { passive: false });
            input.addEventListener('keydown', keyHandler);
        }

        placeHelperUnderField(input, helper);
    }

    function getListInputs(root, fieldName) {
        const labelRegex = new RegExp(
            `^${fieldName}(?:\\s*-\\s*\\d+)?$`,
            'i'
        );

        return [...root.querySelectorAll('input.Polaris-TextField__Input')]
            .filter((input) => {
                const label = getLabelTextForInput(input);
                const near = normalizeText(
                    input.closest('li')?.innerText ||
                    input.closest('li')?.textContent
                );

                return (
                    labelRegex.test(label) ||
                    new RegExp(`${fieldName}\\s*-\\s*\\d+`, 'i').test(near)
                );
            });
    }

    function getAddItemButton(root) {
        const buttons = [...root.querySelectorAll('button, s-internal-button')];

        return (
            buttons.find((button) => normalizeText(button.textContent) === 'Add item') ||
            buttons.find((button) =>
                /Add item/i.test(normalizeText(button.textContent))
            )
        );
    }

    function getRemoveButtonForInput(input) {
        const item = input?.closest('li');
        if (!item) return null;

        const buttons = [...item.querySelectorAll('button, s-internal-button')];

        return (
            buttons.find((button) =>
                /Remove Chapters/i.test(
                    button.getAttribute('aria-label') ||
                    button.getAttribute('accessibilitylabel') ||
                    ''
                )
            ) ||
            buttons.find((button) =>
                /Remove/i.test(normalizeText(button.textContent))
            ) ||
            buttons.at(-1) ||
            null
        );
    }

    async function ensureListInputCount(root, neededCount) {
        let inputs = getListInputs(root, 'Chapters');
        const addButton = getAddItemButton(root);

        if (!addButton) throw new Error('Could not find Add item.');

        let guard = 0;

        while (inputs.length < neededCount && guard < 150) {
            clickElement(addButton);
            await sleep(150);
            inputs = getListInputs(root, 'Chapters');
            guard += 1;
        }

        return inputs;
    }

    async function trimListToCount(root, wantedCount) {
        let inputs = getListInputs(root, 'Chapters');

        for (let index = inputs.length - 1; index >= wantedCount; index -= 1) {
            const input = inputs[index];
            const removeButton = getRemoveButtonForInput(input);

            if (removeButton) {
                clickElement(removeButton);
                await sleep(90);
            } else {
                setNativeInputValue(input, '');
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
        if (count > 150) throw new Error('Range too huge. Max 150.');

        return Array.from({ length: count }, (_, index) => start + index);
    }

    function ensureChaptersHelper(popover) {
        const kind = 'chapters';

        if (popover.querySelector(`[${MF_HELPER_ATTR}="${kind}"]`)) return;

        const inputs = getListInputs(popover, 'Chapters');
        const addButton = getAddItemButton(popover);

        if (!inputs.length || !addButton) return;

        const controlsRow =
            addButton.closest('.Polaris-LegacyStack--distributionEqualSpacing') ||
            addButton.closest('.Polaris-LegacyStack') ||
            addButton.parentElement;

        if (!controlsRow) return;

        const helper = makeMetafieldHelper(kind);
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

        helper.addEventListener('click', async (event) => {
            const button = event.target.closest('button[data-action="fill"]');
            if (!button) return;

            event.preventDefault();
            event.stopPropagation();

            let values;

            try {
                values = buildChapterRange(
                    helper.querySelector('[data-first]').value,
                    helper.querySelector('[data-last]').value
                );
            } catch (error) {
                setHelperStatus(helper, error?.message || 'Invalid range.');
                return;
            }

            button.disabled = true;
            setHelperStatus(helper, `Preparing ${values.length} rows...`);

            try {
                let listInputs = await ensureListInputCount(
                    popover,
                    values.length
                );

                for (let index = 0; index < values.length; index += 1) {
                    listInputs = getListInputs(popover, 'Chapters');
                    const input = listInputs[index];

                    if (!input) throw new Error(`Missing row ${index + 1}.`);

                    setNativeInputValue(input, values[index], {
                        pressEnter: true,
                    });

                    await sleep(55);
                }

                await trimListToCount(popover, values.length);

                setHelperStatus(
                    helper,
                    `Filled ${values[0]} to ${values.at(-1)}.`
                );
            } catch (error) {
                setHelperStatus(
                    helper,
                    error?.message || 'Could not fill chapters.'
                );
            } finally {
                button.disabled = false;
            }
        });

        controlsRow.insertAdjacentElement('afterend', helper);
    }

    function ensureMetafieldHelpers() {
        for (const popover of getMetafieldPopovers()) {
            const kind = getMetafieldKind(popover);

            if (kind === 'volume') ensureIntegerHelper(popover, 'volume');
            if (kind === 'page_count') ensureIntegerHelper(popover, 'page_count');
            if (kind === 'chapters') ensureChaptersHelper(popover);
        }
    }

    function hasAddCollectionHeading(root) {
        return [...root?.querySelectorAll?.('h1, [aria-label="Add collection"]') || []]
            .some((element) =>
                normalizeText(element.getAttribute?.('aria-label')) === 'Add collection' ||
                normalizeText(element.textContent) === 'Add collection'
            );
    }

    function ascendToCollectionEditor(seed) {
        let current = seed;

        while (current && current !== document.documentElement) {
            if (current.querySelector?.('form') && hasAddCollectionHeading(current)) {
                return current;
            }
            current = current.parentElement;
        }

        return null;
    }

    function findCollectionEditorRoots() {
        const roots = [];
        const seen = new Set();

        for (const heading of document.querySelectorAll(
            'h1, [aria-label="Add collection"]'
        )) {
            const isAddCollection =
                normalizeText(heading.getAttribute?.('aria-label')) === 'Add collection' ||
                normalizeText(heading.textContent) === 'Add collection';

            if (!isAddCollection) continue;

            const root = ascendToCollectionEditor(heading);
            if (!root || seen.has(root)) continue;

            seen.add(root);
            roots.push(root);
        }

        return roots;
    }

    function captureMetafieldOrigin(event) {
        const path =
            typeof event.composedPath === 'function'
                ? event.composedPath()
                : [event.target];

        for (const node of path) {
            if (!(node instanceof Element)) continue;

            const ariaLabel = normalizeText(node.getAttribute('aria-label'));
            const match = ariaLabel.match(/^Edit\s+(.+?)\s+metafield$/i);

            if (match) {
                pendingMetafieldOrigin = normalizeText(match[1]);
                pendingMetafieldOriginAt = Date.now();
                return;
            }
        }
    }

    function consumePendingMetafieldOrigin() {
        if (!pendingMetafieldOrigin) return '';

        if (Date.now() - pendingMetafieldOriginAt > ORIGIN_TTL_MS) {
            pendingMetafieldOrigin = '';
            pendingMetafieldOriginAt = 0;
            return '';
        }

        const origin = pendingMetafieldOrigin;
        pendingMetafieldOrigin = '';
        pendingMetafieldOriginAt = 0;
        return origin;
    }

    function assignCollectionOrigins(roots) {
        roots.forEach((root, index) => {
            const existing = normalizeText(
                root.getAttribute(COLLECTION_ORIGIN_ATTR)
            );

            if (existing) {
                collectionOriginStack[index] = existing;
                seenCollectionRoots.add(root);
                return;
            }

            let origin = '';

            if (!seenCollectionRoots.has(root)) {
                origin = consumePendingMetafieldOrigin();
            }

            if (!origin) {
                origin = collectionOriginStack[index] || '';
            }

            if (origin) {
                root.setAttribute(COLLECTION_ORIGIN_ATTR, origin);
                collectionOriginStack[index] = origin;
            }

            seenCollectionRoots.add(root);
        });
    }

    function isSeriesCollectionEditor(root) {
        const origin = normalizeText(
            root.getAttribute(COLLECTION_ORIGIN_ATTR)
        ).toLowerCase();

        return origin === 'series' || origin === 'series collection';
    }

    function findCurrentProductVendor(collectionRoot) {
        for (const field of document.querySelectorAll(
            's-internal-single-picker-field[label="Vendor"]'
        )) {
            if (collectionRoot.contains(field)) continue;

            const value = normalizeText(
                field.querySelector(
                    's-internal-single-picker-field-value'
                )?.textContent
            );

            if (value && value !== 'None') return value;
        }

        return '';
    }

    async function choosePickerOption(trigger, optionValue, verify) {
        if (!trigger) return false;

        clickElement(trigger);

        const option = await waitFor(() => {
            const popover = getLinkedPopover(trigger);
            return popover?.querySelector(
                `s-internal-picker-option[value="${CSS.escape(optionValue)}"]`
            );
        });

        if (!option) return false;

        clickElement(option);

        if (!verify) {
            await sleep(100);
            return true;
        }

        return Boolean(await waitFor(verify));
    }

    function findVisibleAddConditionButton(root) {
        return [...root.querySelectorAll('button')].find(
            (button) =>
                normalizeText(button.textContent) === 'Add condition' &&
                isVisible(button)
        );
    }

    function findVendorConditionRow(root) {
        return [...root.querySelectorAll('[data-condition-row="true"]')].find(
            (row) =>
                row.querySelector(
                    'button[aria-label="Condition attribute: Vendor"]'
                )
        );
    }

    function getRelationButton(row) {
        return row?.querySelector(
            'button[aria-label^="Condition relation:"]'
        );
    }

    function relationIs(button, text) {
        return (
            normalizeText(button?.getAttribute('aria-label')) ===
                `Condition relation: ${text}` ||
            normalizeText(button?.textContent) === text
        );
    }

    async function setRelation(row, optionValue, expectedText) {
        let button = getRelationButton(row);
        if (!button) return false;
        if (relationIs(button, expectedText)) return true;

        return choosePickerOption(button, optionValue, () => {
            button = getRelationButton(row);
            return button && relationIs(button, expectedText);
        });
    }

    async function fillVendorValue(row, vendor) {
        const input = await waitFor(() =>
            row.querySelector('input[aria-label="Vendor values"]')
        );

        if (!input) return null;

        setNativeInputValue(input, vendor);
        await sleep(150);

        if (normalizeText(input.value) !== vendor) {
            input.focus();
            input.select();

            try {
                document.execCommand('insertText', false, vendor);
            } catch {}

            input.dispatchEvent(
                new Event('change', {
                    bubbles: true,
                    composed: true,
                })
            );

            await sleep(150);
        }

        return normalizeText(input.value) === vendor ? input : null;
    }

    function findVisibleAddVendorAction(vendor) {
        const expected = `Add "${vendor}"`;

        return [
            ...document.querySelectorAll(
                's-internal-picker-action, button, [role="option"], [role="menuitem"], [role="button"]'
            ),
        ].find(
            (element) =>
                normalizeText(element.textContent) === expected &&
                isVisible(element)
        );
    }

    async function commitVendorValue(root, input, vendor) {
        let action = await waitFor(
            () => findVisibleAddVendorAction(vendor),
            1800,
            40
        );

        if (action) {
            clickElement(action);
            await waitFor(
                () => !action.isConnected || !isVisible(action),
                1800,
                40
            );
            await sleep(200);
            return true;
        }

        setNativeInputValue(input, vendor, { pressEnter: true });
        await sleep(250);

        action = findVisibleAddVendorAction(vendor);
        if (action) {
            clickElement(action);
            await sleep(200);
        }

        return Boolean(findVendorConditionRow(root));
    }

    function rowHasVendorValue(row, vendor) {
        if (!row) return false;

        const inputValue = normalizeText(
            row.querySelector('input[aria-label="Vendor values"]')?.value
        );

        if (inputValue === vendor) return true;

        return [...row.querySelectorAll('*')].some(
            (element) =>
                element.children.length === 0 &&
                normalizeText(element.textContent) === vendor
        );
    }

    function vendorConditionAlreadyComplete(root, vendor) {
        const row = findVendorConditionRow(root);
        if (!row) return false;

        return (
            relationIs(getRelationButton(row), 'is equal to') &&
            rowHasVendorValue(row, vendor)
        );
    }

    async function relationRemainsEqual(root) {
        await sleep(250);

        let row = findVendorConditionRow(root);
        if (!relationIs(getRelationButton(row), 'is equal to')) return false;

        await sleep(400);

        row = findVendorConditionRow(root);
        return relationIs(getRelationButton(row), 'is equal to');
    }

    async function ensureExactVendorCondition(root, vendor) {
        if (!vendor || collectionAutomationBusy) return;

        if (vendorConditionAlreadyComplete(root, vendor)) {
            root.setAttribute(COLLECTION_AUTOFILLED_ATTR, vendor);
            return;
        }

        if (root.getAttribute(COLLECTION_AUTOFILLED_ATTR) === vendor) return;

        const existingRow = findVendorConditionRow(root);
        const existingValue = normalizeText(
            existingRow?.querySelector(
                'input[aria-label="Vendor values"]'
            )?.value
        );

        if (existingValue && existingValue !== vendor) {
            root.setAttribute(COLLECTION_AUTOFILLED_ATTR, 'manual');
            return;
        }

        collectionAutomationBusy = true;

        try {
            let row = existingRow;

            if (!row) {
                const addConditionButton = findVisibleAddConditionButton(root);
                if (!addConditionButton) return;

                const selected = await choosePickerOption(
                    addConditionButton,
                    VENDOR_ATTRIBUTE_VALUE,
                    () => findVendorConditionRow(root)
                );

                if (!selected) return;
                row = findVendorConditionRow(root);
            }

            if (!row) return;

            if (!(await setRelation(row, STARTS_WITH_VALUE, 'starts with'))) {
                return;
            }

            row = findVendorConditionRow(root) || row;

            const input = await fillVendorValue(row, vendor);
            if (!input) return;

            if (!(await commitVendorValue(root, input, vendor))) return;

            row = findVendorConditionRow(root) || row;

            if (!(await setRelation(row, EQUALS_VALUE, 'is equal to'))) {
                return;
            }

            if (await relationRemainsEqual(root)) {
                root.setAttribute(COLLECTION_AUTOFILLED_ATTR, vendor);
            }
        } catch (error) {
            console.error(
                '[TBB] Vendor condition automation failed:',
                error
            );
        } finally {
            collectionAutomationBusy = false;
        }
    }

    async function applyCollectionAutomation() {
        const roots = findCollectionEditorRoots();
        if (!roots.length) return;

        assignCollectionOrigins(roots);

        for (const root of roots) {
            if (!isSeriesCollectionEditor(root)) continue;

            const vendor = findCurrentProductVendor(root);
            if (vendor) await ensureExactVendorCondition(root, vendor);
        }
    }

    function applyProductTweaks() {
        if (!isProductPage()) return;

        ensureStyles();

        cleanVisibleSections();
        hideProductMetafieldChrome();
        installDescriptionTools();
        stylePriorityLabels();

        expandInventoryDetails();
        expandSearchEngineListing();

        moveInventoryFieldsAboveHandle();
        hideOriginalInventoryAfterMove();

        installSkuCopyButton(document.getElementById(MOVED_INVENTORY_ID));
        installTopJumpButton();

        installTagQuickButtons();
        highlightExistingTags();

        ensureMetafieldHelpers();
    }

    function applyAll() {
        applyProductTweaks();
        ensureMetafieldHelpers();

        void applyCollectionAutomation();
    }

    function scheduleApply(delay = 120) {
        window.clearTimeout(scheduledTimer);
        scheduledTimer = window.setTimeout(applyAll, delay);
    }

    function boot() {
        if (!isProductPage()) return;

        applyAll();

        const observer = new MutationObserver(() => {
            scheduleApply();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });

        document.addEventListener(
            'click',
            (event) => {
                captureMetafieldOrigin(event);
                scheduleApply(40);
            },
            true
        );

        window.addEventListener('load', () => scheduleApply(0));
        window.addEventListener('popstate', () => scheduleApply(0));

        console.info(
            '[TBB] Product Form Cleaner v1.7-test.12 active.'
        );
    }

    boot();
})();
