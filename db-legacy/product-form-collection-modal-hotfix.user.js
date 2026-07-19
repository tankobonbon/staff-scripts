// ==UserScript==
// @name         Shopify Product Edit - Collection Modal Hotfix
// @namespace    http://tampermonkey.net/
// @version      0.3.0-beta.1
// @description  Keeps Shopify's Add collection condition panels visible and automatically creates an exact Vendor condition only for Series collections.
// @match        https://admin.shopify.com/store/tankobonbon-manga-book-store/products/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://github.com/tankobonbon/staff-scripts/raw/refs/heads/fix/shopify-collection-modal-conditions/db-legacy/product-form-collection-modal-hotfix.user.js
// @downloadURL  https://github.com/tankobonbon/staff-scripts/raw/refs/heads/fix/shopify-collection-modal-conditions/db-legacy/product-form-collection-modal-hotfix.user.js
// ==/UserScript==

(() => {
    'use strict';

    const HIDDEN_ATTR = 'data-tm-hidden';
    const AUTOFILLED_ATTR = 'data-tbb-vendor-condition-autofilled';
    const ORIGIN_ATTR = 'data-tbb-collection-origin';
    const VENDOR_ATTRIBUTE_VALUE = 'CollectionSourceInclusionConditionProductVendor';
    const STARTS_WITH_VALUE = 'STARTS_WITH';
    const EQUALS_VALUE = 'EQUALS';
    const ORIGIN_TTL_MS = 120000;

    let applyTimer = null;
    let automationBusy = false;
    let pendingMetafieldOrigin = '';
    let pendingMetafieldOriginAt = 0;

    const seenCollectionRoots = new WeakSet();
    const originStack = [];

    function normalizeText(value) {
        return (value || '').replace(/\s+/g, ' ').trim();
    }

    function sleep(ms) {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
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

    function isVisible(element) {
        if (!element?.isConnected) return false;

        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return false;

        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
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

    function findCollectionEditorRoots() {
        const roots = [];
        const seen = new Set();
        const headings = document.querySelectorAll('h1, [aria-label="Add collection"]');

        for (const heading of headings) {
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
        const path = typeof event.composedPath === 'function'
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

    function assignCollectionOrigins(collectionRoots) {
        collectionRoots.forEach((root, index) => {
            const existingOrigin = normalizeText(root.getAttribute(ORIGIN_ATTR));

            if (existingOrigin) {
                originStack[index] = existingOrigin;
                seenCollectionRoots.add(root);
                return;
            }

            const isNewRoot = !seenCollectionRoots.has(root);
            let origin = '';

            if (isNewRoot) {
                origin = consumePendingMetafieldOrigin();
            }

            if (!origin) {
                origin = originStack[index] || '';
            }

            if (origin) {
                root.setAttribute(ORIGIN_ATTR, origin);
                originStack[index] = origin;
            }

            seenCollectionRoots.add(root);
        });

        originStack.length = Math.max(originStack.length, collectionRoots.length);
    }

    function restoreHiddenCollectionCards(collectionRoot) {
        collectionRoot.querySelectorAll(`[${HIDDEN_ATTR}="true"]`).forEach((element) => {
            element.removeAttribute(HIDDEN_ATTR);
        });
    }

    function isSeriesCollectionEditor(collectionRoot) {
        const origin = normalizeText(collectionRoot.getAttribute(ORIGIN_ATTR)).toLowerCase();
        return origin === 'series' || origin === 'series collection';
    }

    function findCurrentProductVendor(collectionRoot) {
        const fields = document.querySelectorAll('s-internal-single-picker-field[label="Vendor"]');

        for (const field of fields) {
            if (collectionRoot.contains(field)) continue;

            const value = normalizeText(
                field.querySelector('s-internal-single-picker-field-value')?.textContent
            );

            if (value && value !== 'None') return value;
        }

        return '';
    }

    function getLinkedPopover(trigger) {
        const id = trigger?.getAttribute('commandfor') ||
            trigger?.getAttribute('aria-controls') ||
            trigger?.getAttribute('aria-owns');

        return id ? document.getElementById(id) : null;
    }

    async function choosePickerOption(trigger, optionValue, verify) {
        if (!trigger) return false;

        trigger.click();

        const option = await waitFor(() => {
            const linkedPopover = getLinkedPopover(trigger);
            return linkedPopover?.querySelector(`s-internal-picker-option[value="${optionValue}"]`) || null;
        });

        if (!option) return false;

        option.click();

        if (!verify) {
            await sleep(100);
            return true;
        }

        return Boolean(await waitFor(verify));
    }

    function findVisibleAddConditionButton(collectionRoot) {
        return Array.from(collectionRoot.querySelectorAll('button')).find((button) => {
            return normalizeText(button.textContent) === 'Add condition' && isVisible(button);
        }) || null;
    }

    function findVendorConditionRow(collectionRoot) {
        return Array.from(collectionRoot.querySelectorAll('[data-condition-row="true"]')).find((row) => {
            return row.querySelector('button[aria-label="Condition attribute: Vendor"]');
        }) || null;
    }

    function getRelationButton(row) {
        return row?.querySelector('button[aria-label^="Condition relation:"]') || null;
    }

    function relationIs(button, text) {
        return normalizeText(button?.getAttribute('aria-label')) === `Condition relation: ${text}` ||
            normalizeText(button?.textContent) === text;
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

    function setNativeInputValue(input, value) {
        const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
        )?.set;

        if (setter) {
            setter.call(input, value);
        } else {
            input.value = value;
        }

        input.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            composed: true,
            inputType: 'insertText',
            data: value,
        }));
        input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }

    async function fillVendorValue(row, vendor) {
        const input = await waitFor(() => row.querySelector('input[aria-label="Vendor values"]'));
        if (!input) return null;

        input.focus();
        setNativeInputValue(input, vendor);
        await sleep(150);

        if (normalizeText(input.value) !== vendor) {
            input.focus();
            input.select();
            document.execCommand('insertText', false, vendor);
            input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
            await sleep(150);
        }

        return normalizeText(input.value) === vendor ? input : null;
    }

    function findVisibleAddVendorAction(vendor) {
        const expected = `Add "${vendor}"`;
        const candidates = document.querySelectorAll(
            's-internal-picker-action, button, [role="option"], [role="menuitem"], [role="button"]'
        );

        return Array.from(candidates).find((element) => {
            return normalizeText(element.textContent) === expected && isVisible(element);
        }) || null;
    }

    async function commitVendorValue(collectionRoot, input, vendor) {
        let action = await waitFor(() => findVisibleAddVendorAction(vendor), 1800, 40);

        if (action) {
            action.click();
            await waitFor(() => !action.isConnected || !isVisible(action), 1800, 40);
            await sleep(200);
            return true;
        }

        input.focus();
        input.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            composed: true,
        }));
        input.dispatchEvent(new KeyboardEvent('keyup', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            composed: true,
        }));
        await sleep(250);

        action = findVisibleAddVendorAction(vendor);
        if (action) {
            action.click();
            await sleep(200);
        }

        const row = findVendorConditionRow(collectionRoot);
        return Boolean(row);
    }

    function rowHasVendorValue(row, vendor) {
        if (!row) return false;

        const inputValue = normalizeText(
            row.querySelector('input[aria-label="Vendor values"]')?.value
        );
        if (inputValue === vendor) return true;

        return Array.from(row.querySelectorAll('*')).some((element) => {
            if (element.children.length > 0) return false;
            return normalizeText(element.textContent) === vendor;
        });
    }

    function vendorConditionAlreadyComplete(collectionRoot, vendor) {
        const row = findVendorConditionRow(collectionRoot);
        if (!row) return false;

        return relationIs(getRelationButton(row), 'is equal to') &&
            rowHasVendorValue(row, vendor);
    }

    async function relationRemainsEqual(collectionRoot) {
        await sleep(250);
        let row = findVendorConditionRow(collectionRoot);
        if (!relationIs(getRelationButton(row), 'is equal to')) return false;

        await sleep(400);
        row = findVendorConditionRow(collectionRoot);
        return relationIs(getRelationButton(row), 'is equal to');
    }

    async function ensureExactVendorCondition(collectionRoot, vendor) {
        if (!vendor || automationBusy) return;

        if (vendorConditionAlreadyComplete(collectionRoot, vendor)) {
            collectionRoot.setAttribute(AUTOFILLED_ATTR, vendor);
            return;
        }

        if (collectionRoot.getAttribute(AUTOFILLED_ATTR) === vendor) return;

        const existingVendorRow = findVendorConditionRow(collectionRoot);
        const existingValue = normalizeText(
            existingVendorRow?.querySelector('input[aria-label="Vendor values"]')?.value
        );

        if (existingValue && existingValue !== vendor) {
            collectionRoot.setAttribute(AUTOFILLED_ATTR, 'manual');
            return;
        }

        automationBusy = true;

        try {
            let row = existingVendorRow;

            if (!row) {
                const addConditionButton = findVisibleAddConditionButton(collectionRoot);
                if (!addConditionButton) return;

                const selected = await choosePickerOption(
                    addConditionButton,
                    VENDOR_ATTRIBUTE_VALUE,
                    () => findVendorConditionRow(collectionRoot)
                );

                if (!selected) return;
                row = findVendorConditionRow(collectionRoot);
            }

            if (!row) return;

            const startsWithSet = await setRelation(row, STARTS_WITH_VALUE, 'starts with');
            if (!startsWithSet) return;

            row = findVendorConditionRow(collectionRoot) || row;

            const input = await fillVendorValue(row, vendor);
            if (!input) return;

            const committed = await commitVendorValue(collectionRoot, input, vendor);
            if (!committed) return;

            row = findVendorConditionRow(collectionRoot) || row;

            const equalsSet = await setRelation(row, EQUALS_VALUE, 'is equal to');
            if (!equalsSet) return;

            if (await relationRemainsEqual(collectionRoot)) {
                collectionRoot.setAttribute(AUTOFILLED_ATTR, vendor);
            }
        } catch (error) {
            console.error('[TBB] Vendor condition automation failed:', error);
        } finally {
            automationBusy = false;
        }
    }

    async function applyFix() {
        const collectionRoots = findCollectionEditorRoots();
        if (!collectionRoots.length) return;

        assignCollectionOrigins(collectionRoots);

        for (const collectionRoot of collectionRoots) {
            restoreHiddenCollectionCards(collectionRoot);
        }

        for (const collectionRoot of collectionRoots) {
            if (!isSeriesCollectionEditor(collectionRoot)) continue;

            const vendor = findCurrentProductVendor(collectionRoot);
            if (vendor) {
                await ensureExactVendorCondition(collectionRoot, vendor);
            }
        }
    }

    function scheduleApply() {
        window.clearTimeout(applyTimer);
        applyTimer = window.setTimeout(() => {
            void applyFix();
        }, 0);
    }

    const observer = new MutationObserver(scheduleApply);
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [HIDDEN_ATTR],
    });

    document.addEventListener('click', (event) => {
        captureMetafieldOrigin(event);
        scheduleApply();
    }, true);

    window.setInterval(() => {
        void applyFix();
    }, 500);

    scheduleApply();
})();
