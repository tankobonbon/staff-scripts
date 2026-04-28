// ==UserScript==
// @name         Airtable Interface - Vendor Link Helper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Helper panel for Vendor copy + Airtable workflow links.
// @match        https://airtable.com/appkGoa9PDJzEj1jp/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-airtable/vendor-link-helper.user.js
// @downloadURL  https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-airtable/vendor-link-helper.user.js
// ==/UserScript==

(function () {
    'use strict';

    const PANEL_ID = 'tbb-vendor-link-helper';

    function normalize(text) {
        return (text || '').replace(/\s+/g, ' ').trim();
    }

    function getRoot() {
        return [...document.querySelectorAll('[data-testid="page-element:recordContainer"]')]
            .find(el => el.getBoundingClientRect().left > window.innerWidth * 0.6)
            || document.querySelector('[data-testid="page-element:recordContainer"]');
    }

    function getVendorTitle(root) {
        return normalize(
            document.querySelector('.topSidesheet h2')?.textContent ||
            root.querySelector('.heading-size-xxlarge')?.textContent ||
            ''
        );
    }

    function getFieldBlock(root, label) {
        const labels = [...root.querySelectorAll('[data-testid="page-element-label"]')];

        for (const l of labels) {
            if (normalize(l.textContent).toLowerCase() === label.toLowerCase()) {
                return l.closest('[data-testid="sideBySideLabel"], [data-testid="stackedLabel"]');
            }
        }

        return null;
    }

    function getLink(root, label) {
        const block = getFieldBlock(root, label);
        if (!block) return '';

        const link = block.querySelector('a[data-button-field-button="true"][href], a[href]');
        return link ? link.href : '';
    }

    function copy(text) {
        navigator.clipboard.writeText(text);
    }

    function inject(root) {
        if (!root || document.getElementById(PANEL_ID)) return;

        const title = root.querySelector('.heading-size-xxlarge');
        if (!title) return;

        const row = title.closest('[data-testid="page-element:cellEditor"]');
        if (!row) return;

        const panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.style.display = 'flex';
        panel.style.flexDirection = 'column';
        panel.style.gap = '8px';
        panel.style.padding = '12px';
        panel.style.marginBottom = '10px';
        panel.style.border = '1px solid #fb923c';
        panel.style.borderRadius = '12px';
        panel.style.background = '#fff7ed';

        const buttonRow = document.createElement('div');
        buttonRow.style.display = 'flex';
        buttonRow.style.gap = '8px';
        buttonRow.style.flexWrap = 'wrap';

        const tooltip = document.createElement('div');
        tooltip.textContent = 'Ready for NEW COLLECTION.';
        tooltip.style.fontStyle = 'italic';
        tooltip.style.opacity = '0.6';
        tooltip.style.fontSize = '12px';
        tooltip.style.color = '#c2410c';
        tooltip.style.minHeight = '16px';

        const getData = () => ({
            vendor: getVendorTitle(root),
            collectionSearch: getLink(root, 'Search by Collection'),
            bulkEditBooks: getLink(root, 'Bulk Edit'),
            anilist: getLink(root, 'Anilist link'),
            mu: getLink(root, 'MU link')
        });

        function createBtn(label, handler, isPrimary = false) {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.padding = '6px 10px';
            btn.style.fontSize = '12px';
            btn.style.borderRadius = '8px';
            btn.style.border = '1px solid #fb923c';
            btn.style.cursor = 'pointer';
            btn.style.transition = 'all .15s ease';
            btn.style.background = isPrimary ? '#f97316' : '#fed7aa';
            btn.style.color = isPrimary ? '#fff' : '#9a3412';

            btn.onmouseenter = () => { btn.style.opacity = '0.85'; };
            btn.onmouseleave = () => { btn.style.opacity = '1'; };
            btn.onclick = e => {
                e.stopPropagation();
                handler();
            };

            return btn;
        }

        buttonRow.appendChild(createBtn('Copy Vendor', () => {
            const v = getData().vendor;
            if (!v) return;

            copy(v);
            tooltip.textContent = `Copied ${v}`;
            tooltip.style.fontStyle = 'normal';
            tooltip.style.opacity = '1';
        }));

        buttonRow.appendChild(createBtn('Ctrl + Open', () => {
            const d = getData();

            const urls = [
                d.collectionSearch,
                d.bulkEditBooks,
                d.anilist,
                d.mu
            ].filter(Boolean);

            urls.forEach(url => window.open(url, '_blank'));

            tooltip.textContent = `Opened ${urls.length} tab(s)`;
            tooltip.style.fontStyle = 'normal';
            tooltip.style.opacity = '1';
        }, true));

        panel.appendChild(buttonRow);
        panel.appendChild(tooltip);

        row.parentElement.insertBefore(panel, row);
    }

    function boot() {
        const obs = new MutationObserver(() => {
            const root = getRoot();
            if (root) inject(root);
        });

        obs.observe(document.body, { childList: true, subtree: true });

        const root = getRoot();
        if (root) inject(root);
    }

    boot();
})();
