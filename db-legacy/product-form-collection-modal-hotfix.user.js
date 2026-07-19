// ==UserScript==
// @name         Shopify Product Edit - Collection Modal Hotfix
// @namespace    http://tampermonkey.net/
// @version      0.1.1-beta.1
// @description  Keeps Shopify's new Add collection condition panel visible beside the existing product-form cleaner.
// @match        https://admin.shopify.com/store/tankobonbon-manga-book-store/products/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://github.com/tankobonbon/staff-scripts/raw/refs/heads/fix/shopify-collection-modal-conditions/db-legacy/product-form-collection-modal-hotfix.user.js
// @downloadURL  https://github.com/tankobonbon/staff-scripts/raw/refs/heads/fix/shopify-collection-modal-conditions/db-legacy/product-form-collection-modal-hotfix.user.js
// ==/UserScript==

(() => {
    'use strict';

    const HIDDEN_ATTR = 'data-tm-hidden';
    let applyTimer = null;

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

    function restoreHiddenCollectionCards(collectionRoot) {
        collectionRoot.querySelectorAll(`[${HIDDEN_ATTR}="true"]`).forEach((element) => {
            element.removeAttribute(HIDDEN_ATTR);
        });
    }

    function applyFix() {
        const collectionRoot = findCollectionEditorRoot();
        if (!collectionRoot) return;

        restoreHiddenCollectionCards(collectionRoot);
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
