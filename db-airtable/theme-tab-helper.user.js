// ==UserScript==
// @name         Airtable Interface - Theme Tab Helper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Helper panel with Ctrl+Open button for theme workflow.
// @match        https://airtable.com/appkGoa9PDJzEj1jp/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-airtable/theme-tab-helper.user.js
// @downloadURL  https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-airtable/theme-tab-helper.user.js
// ==/UserScript==

(function () {
    'use strict';

    const PANEL_ID = 'tbb-theme-tab-helper';

    function normalize(text) {
        return (text || '').replace(/\s+/g, ' ').trim();
    }

    function getRoot() {
        return [...document.querySelectorAll('[data-testid="page-element:recordContainer"]')]
            .find(el => el.getBoundingClientRect().left > window.innerWidth * 0.6)
            || document.querySelector('[data-testid="page-element:recordContainer"]');
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

        const link = block.querySelector('a[data-button-field-button="true"][href]');
        return link ? link.href : '';
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
        panel.style.border = '1px solid #93c5fd';
        panel.style.borderRadius = '12px';
        panel.style.background = '#eff6ff';

        const buttonRow = document.createElement('div');
        buttonRow.style.display = 'flex';
        buttonRow.style.gap = '8px';
        buttonRow.style.flexWrap = 'wrap';

        const tooltip = document.createElement('div');
        tooltip.textContent = 'Ready for ADDING THEMES.';
        tooltip.style.fontStyle = 'italic';
        tooltip.style.opacity = '0.6';
        tooltip.style.fontSize = '12px';
        tooltip.style.color = '#1d4ed8';
        tooltip.style.minHeight = '16px';

        const getData = () => ({
            editOnShopify: getLink(root, 'Shopify editor'),
            searchOnAL: getLink(root, 'AL search'),
            searchOnMU: getLink(root, 'MangaUpdates'),
            searchTitlesOnShopify: getLink(root, 'Shopify search')
        });

        function createBtn(label, handler, isPrimary) {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.padding = '6px 10px';
            btn.style.fontSize = '12px';
            btn.style.borderRadius = '8px';
            btn.style.border = '1px solid #93c5fd';
            btn.style.cursor = 'pointer';
            btn.style.transition = 'all .15s ease';
            btn.style.background = isPrimary ? '#2563eb' : '#dbeafe';
            btn.style.color = isPrimary ? '#fff' : '#1d4ed8';

            btn.onmouseenter = () => { btn.style.opacity = '0.85'; };
            btn.onmouseleave = () => { btn.style.opacity = '1'; };
            btn.onclick = e => {
                e.stopPropagation();
                handler();
            };

            return btn;
        }

        buttonRow.appendChild(createBtn('Ctrl + Open tabs', () => {
            const d = getData();
            const urls = [
                d.editOnShopify,
                d.searchOnAL,
                d.searchOnMU,
                d.searchTitlesOnShopify
            ].filter(Boolean);

            urls.forEach(u => window.open(u, '_blank'));

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
