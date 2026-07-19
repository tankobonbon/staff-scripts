// ==UserScript==
// @name         Shopify Product Edit - Collection Modal Hotfix
// @namespace    http://tampermonkey.net/
// @version      0.1.0-beta.1
// @description  Keeps Shopify's new Add collection condition panel visible beside the existing product-form cleaner and shows a safe exact-series workaround.
// @match        https://admin.shopify.com/store/tankobonbon-manga-book-store/products/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://github.com/tankobonbon/staff-scripts/raw/refs/heads/fix/shopify-collection-modal-conditions/db-legacy/product-form-collection-modal-hotfix.user.js
// @downloadURL  https://github.com/tankobonbon/staff-scripts/raw/refs/heads/fix/shopify-collection-modal-conditions/db-legacy/product-form-collection-modal-hotfix.user.js
// ==/UserScript==

(() => {
    'use strict';

    const HIDDEN_ATTR = 'data-tm-hidden';
    const HELPER_ID = 'tbb-exact-series-condition-helper';
    const STYLE_ID = 'tbb-collection-modal-fix-style';

    let applyTimer = null;
    let lastKnownVendor = '';

    function normalizeText(value) {
        return (value || '').replace(/\s+/g, ' ').trim();
    }

    function hasAddCollectionHeading(root) {
        if (!root?.querySelectorAll) return false;

        return Array.from(root.querySelectorAll('h1, [aria-label="Add collection"]')).some((element) => {
            return normalizeText(element.getAttribute?.('aria-label')) === 'Add collection' ||
                normalizeText(element.textContent) === 'Add collection';
        });
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

    function findCollectionEditorRoot() {
        const closeButton = document.getElementById('activity-dialog-close-button');
        const fromCloseButton = ascendToCollectionEditor(closeButton);
        if (fromCloseButton) return fromCloseButton;

        const heading = Array.from(document.querySelectorAll('h1, [aria-label="Add collection"]')).find((element) => {
            return normalizeText(element.getAttribute?.('aria-label')) === 'Add collection' ||
                normalizeText(element.textContent) === 'Add collection';
        });

        return ascendToCollectionEditor(heading);
    }

    function getControlValue(control) {
        if (!control) return '';

        if (control instanceof HTMLSelectElement) {
            return normalizeText(control.selectedOptions?.[0]?.textContent || control.value);
        }

        if ('value' in control && typeof control.value === 'string') {
            return normalizeText(control.value);
        }

        return normalizeText(control.textContent);
    }

    function findVendorFromProductForm(collectionRoot) {
        const directSelectors = [
            'input[name="vendor"]',
            'input[aria-label="Vendor"]',
            'input[aria-label="Product vendor"]',
            'select[name="vendor"]',
            '[data-product-vendor] input',
        ];

        for (const selector of directSelectors) {
            for (const control of document.querySelectorAll(selector)) {
                if (collectionRoot.contains(control)) continue;

                const value = getControlValue(control);
                if (value) return value;
            }
        }

        const vendorLabels = Array.from(document.querySelectorAll('label, p, span, div')).filter((element) => {
            return !collectionRoot.contains(element) && normalizeText(element.textContent) === 'Vendor';
        });

        for (const label of vendorLabels) {
            const controlId = label.getAttribute?.('for');
            const linkedControl = controlId ? document.getElementById(controlId) : null;
            const linkedValue = getControlValue(linkedControl);
            if (linkedValue && linkedValue !== 'Vendor') return linkedValue;

            const wrapper =
                label.closest('.Polaris-FormLayout__Item') ||
                label.closest('s-internal-section') ||
                label.parentElement?.parentElement ||
                label.parentElement;

            if (!wrapper) continue;

            const candidate = wrapper.querySelector(
                'input:not([aria-label="Vendor values"]), select, button[aria-haspopup="listbox"], [role="combobox"]'
            );
            const value = getControlValue(candidate);

            if (value && value !== 'Vendor' && value !== 'Select vendor') {
                return value;
            }
        }

        return '';
    }

    function restoreHiddenCollectionCards(collectionRoot) {
        collectionRoot.querySelectorAll(`[${HIDDEN_ATTR}="true"]`).forEach((element) => {
            element.removeAttribute(HIDDEN_ATTR);
        });
    }

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${HELPER_ID} {
                box-sizing: border-box;
                margin: 0 0 1rem;
                padding: 0.85rem;
                border: 1px solid #c9cccf;
                border-radius: 0.75rem;
                background: #f6f6f7;
                color: #202223;
                font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            #${HELPER_ID} strong {
                display: block;
                margin-bottom: 0.35rem;
                font-size: 14px;
            }

            #${HELPER_ID} p {
                margin: 0.3rem 0;
            }

            #${HELPER_ID} ol {
                margin: 0.55rem 0 0.35rem 1.2rem;
                padding: 0;
            }

            #${HELPER_ID} .tbb-series-copy-row {
                display: flex;
                gap: 0.45rem;
                margin-top: 0.65rem;
            }

            #${HELPER_ID} input {
                min-width: 0;
                flex: 1;
                padding: 0.45rem 0.55rem;
                border: 1px solid #8c9196;
                border-radius: 0.45rem;
                background: #fff;
                color: #202223;
            }

            #${HELPER_ID} button {
                appearance: none;
                padding: 0.45rem 0.65rem;
                border: 1px solid #8c9196;
                border-radius: 0.45rem;
                background: #fff;
                color: #202223;
                font-weight: 650;
                cursor: pointer;
            }

            #${HELPER_ID} button:hover {
                background: #f1f2f3;
            }
        `;

        document.head.appendChild(style);
    }

    async function copyText(text) {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
    }

    function buildHelper() {
        const helper = document.createElement('div');
        helper.id = HELPER_ID;

        const heading = document.createElement('strong');
        heading.textContent = 'Exact series condition (Shopify workaround)';
        helper.appendChild(heading);

        const explanation = document.createElement('p');
        explanation.textContent = 'If Shopify refuses a new Vendor value for “is equal to”, keep both rules in the same Products source and set its match type to ALL:';
        helper.appendChild(explanation);

        const steps = document.createElement('ol');
        const first = document.createElement('li');
        first.textContent = 'Vendor → starts with → your exact series name';
        const second = document.createElement('li');
        second.textContent = 'Vendor → ends with → the same exact series name';
        steps.append(first, second);
        helper.appendChild(steps);

        const note = document.createElement('p');
        note.textContent = 'Together, those rules act as an exact whole-value match for normal series names, without the false matches caused by a single “contains” rule.';
        helper.appendChild(note);

        const copyRow = document.createElement('div');
        copyRow.className = 'tbb-series-copy-row';

        const vendorInput = document.createElement('input');
        vendorInput.type = 'text';
        vendorInput.readOnly = true;
        vendorInput.placeholder = 'Current product Vendor was not detected';
        vendorInput.value = lastKnownVendor;
        vendorInput.setAttribute('aria-label', 'Detected current product Vendor');

        const copyButton = document.createElement('button');
        copyButton.type = 'button';
        copyButton.textContent = 'Copy';
        copyButton.disabled = !lastKnownVendor;
        copyButton.addEventListener('click', async () => {
            if (!vendorInput.value) return;

            const original = copyButton.textContent;
            try {
                await copyText(vendorInput.value);
                copyButton.textContent = 'Copied';
            } catch (error) {
                console.error('[TBB] Failed to copy product Vendor:', error);
                copyButton.textContent = 'Copy failed';
            }

            window.setTimeout(() => {
                copyButton.textContent = original;
            }, 1100);
        });

        copyRow.append(vendorInput, copyButton);
        helper.appendChild(copyRow);

        return helper;
    }

    function ensureHelper(collectionRoot) {
        ensureStyles();

        const sidebar = collectionRoot.querySelector('.Polaris-Layout__Section--oneThird');
        const sidebarStack = sidebar?.querySelector('.Polaris-BlockStack') || sidebar;
        if (!sidebarStack) return;

        let helper = collectionRoot.querySelector(`#${HELPER_ID}`);
        if (!helper) {
            helper = buildHelper();
            sidebarStack.insertAdjacentElement('afterbegin', helper);
        }

        const input = helper.querySelector('input');
        const button = helper.querySelector('button');

        if (input && input.value !== lastKnownVendor) {
            input.value = lastKnownVendor;
        }

        if (button) {
            button.disabled = !lastKnownVendor;
        }
    }

    function applyFix() {
        const collectionRoot = findCollectionEditorRoot();
        if (!collectionRoot) return;

        const detectedVendor = findVendorFromProductForm(collectionRoot);
        if (detectedVendor) {
            lastKnownVendor = detectedVendor;
        }

        restoreHiddenCollectionCards(collectionRoot);
        ensureHelper(collectionRoot);
    }

    function scheduleApply() {
        window.clearTimeout(applyTimer);
        applyTimer = window.setTimeout(applyFix, 0);
    }

    const observer = new MutationObserver(scheduleApply);
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [HIDDEN_ATTR],
    });

    document.addEventListener('click', scheduleApply, true);
    window.setInterval(applyFix, 500);
    scheduleApply();
})();
