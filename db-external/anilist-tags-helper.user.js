// ==UserScript==
// @name         Themes Auto-paster + Anilist Helper
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Copy AniList tags or AniList ID, then paste tags into Shopify collection Themes list metafield.
// @match        https://anilist.co/anime/*
// @match        https://anilist.co/manga/*
// @match        https://admin.shopify.com/store/*/collections/*
// @match        https://admin.shopify.com/store/*/collection/*
// @match        https://admin.shopify.com/store/*/products/*
// @match        https://admin.shopify.com/store/*/bulk/*
// @run-at       document-idle
// @grant        GM_setClipboard
// @updateURL    https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/anilist-tags-helper.user.js
// @downloadURL  https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/anilist-tags-helper.user.js
// ==/UserScript==

(function () {
    'use strict';

    const STYLE_ID = 'tm-anilist-shopify-themes-style';
    const PANEL_ID = 'tm-anilist-shopify-themes-panel';

    const IS_ANILIST = location.hostname === 'anilist.co';
    const IS_SHOPIFY = location.hostname === 'admin.shopify.com';

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function normalizeText(text) {
        return (text || '')
            .replace(/\u00A0/g, ' ')
            .replace(/[ \t\f\v]+/g, ' ')
            .trim();
    }

    function uniqueCleanList(items) {
        const seen = new Set();
        const out = [];

        for (const item of items || []) {
            const clean = normalizeText(item);
            const key = clean.toLowerCase();

            if (!clean || seen.has(key)) continue;

            seen.add(key);
            out.push(clean);
        }

        return out;
    }

    async function copyPlainText(text) {
        if (!text) return false;

        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (_) {}

        try {
            GM_setClipboard(text, 'text');
            return true;
        } catch (_) {}

        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();

        try {
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch (_) {
            document.body.removeChild(ta);
            return false;
        }
    }

    async function readClipboardText() {
        try {
            return await navigator.clipboard.readText();
        } catch (_) {
            return '';
        }
    }

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        top: 10px;
        right: 12px;
        z-index: 999999;
        display: flex;
        gap: 8px;
        align-items: center;
        font-family: Arial, sans-serif;
      }

      #${PANEL_ID} button {
        appearance: none;
        border: 1px solid rgba(0,0,0,.18);
        border-radius: 999px;
        background: #111827;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        padding: 8px 12px;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(0,0,0,.18);
      }

      #${PANEL_ID} button.secondary {
        background: #fff;
        color: #111827;
      }

      #${PANEL_ID} .tm-status {
        max-width: 360px;
        background: #fff;
        color: #111827;
        border: 1px solid rgba(0,0,0,.14);
        border-radius: 999px;
        padding: 7px 10px;
        font-size: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,.14);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;

        document.head.appendChild(style);
    }

    function setStatus(message) {
        const status = document.querySelector(`#${PANEL_ID} .tm-status`);
        if (status) status.textContent = message || '';
    }

    function createPanel(buttonsHtml) {
        if (document.getElementById(PANEL_ID)) return;

        ensureStyles();

        const panel = document.createElement('div');
        panel.id = PANEL_ID;
        panel.innerHTML = `
      ${buttonsHtml}
      <span class="tm-status"></span>
    `;

        document.body.appendChild(panel);
        return panel;
    }

    function getAniListMediaId() {
        const match = location.pathname.match(/\/(?:anime|manga)\/(\d+)/i);
        return match ? Number(match[1]) : null;
    }

    async function getAniListTagsFromApi() {
        const id = getAniListMediaId();
        if (!id) return [];

        const query = `
      query ($id: Int!) {
        media: Media(id: $id) {
          tags {
            name
            rank
            isMediaSpoiler
          }
        }
      }
    `;

        const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query,
                variables: { id }
            })
        });

        const json = await res.json();
        const tags = json?.data?.media?.tags || [];

        return uniqueCleanList(tags.map(tag => tag.name));
    }

    function getAniListTagsFromPageFallback() {
        const fromDom = [...document.querySelectorAll('.tags .tag .name, .tag .name')]
            .map(el => normalizeText(el.textContent))
            .filter(Boolean);

        const fromJsonLd = [];

        document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
            try {
                const data = JSON.parse(script.textContent || '{}');
                const keywords = data?.mainEntity?.keywords;
                if (Array.isArray(keywords)) fromJsonLd.push(...keywords);
            } catch (_) {}
        });

        return uniqueCleanList([...fromDom, ...fromJsonLd]);
    }

    async function bootAniList() {
        const panel = createPanel(`
      <button type="button" data-action="copy-anilist-id">Copy AniList ID</button>
      <button type="button" data-action="copy-anilist-tags">Copy AniList Tags</button>
      <button type="button" class="secondary" data-action="copy-anilist-tags-csv">Copy CSV</button>
    `);

        panel.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;

            if (action === 'copy-anilist-id') {
                const id = getAniListMediaId();

                if (!id) {
                    setStatus('No AniList ID found.');
                    return;
                }

                const ok = await copyPlainText(String(id));

                setStatus(ok
                    ? `Copied AniList ID: ${id}`
                    : 'Could not copy AniList ID.'
                );

                return;
            }

            setStatus('Fetching tags...');

            let tags = [];

            try {
                tags = await getAniListTagsFromApi();
            } catch (_) {
                tags = [];
            }

            if (!tags.length) {
                tags = getAniListTagsFromPageFallback();
            }

            if (!tags.length) {
                setStatus('No tags found. AniList goblin escaped.');
                return;
            }

            const text = action === 'copy-anilist-tags-csv'
                ? tags.join(', ')
                : tags.join('\n');

            const ok = await copyPlainText(text);

            setStatus(ok
                ? `Copied ${tags.length} tags.`
                : 'Could not copy tags.'
            );
        });
    }

    function parseTagsFromClipboard(text) {
        if (!text) return [];

        return uniqueCleanList(
            text
                .split(/\r?\n|,/g)
                .map(item => item.trim())
                .filter(Boolean)
        );
    }

    function getVisibleThemePopover() {
        const overlays = [...document.querySelectorAll('._CardPopover-show_16thr_27, ._CardPopover_16thr_8, [class*="CardPopover"]')];

        for (const overlay of overlays) {
            const text = overlay.innerText || '';
            if (/\bThemes\b/i.test(text) && /Single line text \(List\)/i.test(text)) {
                return overlay;
            }
        }

        const fallback = [...document.querySelectorAll('body *')]
            .reverse()
            .find(el => {
                const text = el.innerText || '';
                return text.includes('Themes') && text.includes('Single line text (List)') && text.includes('Add item');
            });

        return fallback || document.body;
    }

    function getThemeInputs(root) {
        return [...root.querySelectorAll('input.Polaris-TextField__Input')]
            .filter(input => {
                const labelText =
                    input.getAttribute('aria-labelledby')
                        ? document.getElementById(input.getAttribute('aria-labelledby'))?.textContent || ''
                        : '';

                const nearText = input.closest('li')?.innerText || '';

                return /Themes/i.test(labelText) || /Themes/i.test(nearText);
            });
    }

    function getAddItemButton(root) {
        const buttons = [...root.querySelectorAll('button, s-internal-button')];

        return buttons.find(btn => normalizeText(btn.textContent) === 'Add item') ||
            buttons.find(btn => /Add item/i.test(normalizeText(btn.textContent)));
    }

    function setReactInputValue(input, value) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
        )?.set;

        nativeSetter.call(input, value);

        input.dispatchEvent(new Event('input', { bubbles: true }));
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
    }

    async function ensureInputCount(root, neededCount) {
        let inputs = getThemeInputs(root);
        const addButton = getAddItemButton(root);

        if (!addButton) {
            throw new Error('Could not find Add item button. Open the Themes metafield popover first.');
        }

        let guard = 0;

        while (inputs.length < neededCount && guard < 100) {
            addButton.click();
            await sleep(160);
            inputs = getThemeInputs(root);
            guard++;
        }

        return inputs;
    }

    async function fillShopifyThemes(tags) {
        const root = getVisibleThemePopover();

        if (!root) {
            throw new Error('Could not find Themes popover.');
        }

        let inputs = getThemeInputs(root);

        if (!inputs.length) {
            throw new Error('Open the Themes metafield popover first, then click the helper button.');
        }

        const existingValues = uniqueCleanList(inputs.map(input => input.value).filter(Boolean));
        const existingKeys = new Set(existingValues.map(v => v.toLowerCase()));

        const tagsToAdd = tags.filter(tag => !existingKeys.has(tag.toLowerCase()));

        if (!tagsToAdd.length) {
            return {
                added: 0,
                skipped: tags.length,
                message: 'No new tags to add.'
            };
        }

        const emptyInputs = inputs.filter(input => !normalizeText(input.value));
        const neededExtraInputs = Math.max(0, tagsToAdd.length - emptyInputs.length);
        const neededTotalInputs = inputs.length + neededExtraInputs;

        inputs = await ensureInputCount(root, neededTotalInputs);

        const availableInputs = inputs.filter(input => !normalizeText(input.value));

        for (let i = 0; i < tagsToAdd.length; i++) {
            const input = availableInputs[i];
            if (!input) break;

            input.focus();
            setReactInputValue(input, tagsToAdd[i]);
            await sleep(80);
        }

        return {
            added: tagsToAdd.length,
            skipped: tags.length - tagsToAdd.length,
            message: `Added ${tagsToAdd.length} tags.`
        };
    }

    function findThemesPopover() {
        const overlays = [...document.querySelectorAll('._CardPopover-show_16thr_27, ._CardPopover_16thr_8, [class*="CardPopover"]')];

        for (const overlay of overlays) {
            const text = overlay.innerText || '';
            if (/\bThemes\b/i.test(text) && /Single line text \(List\)/i.test(text) && /Add item/i.test(text)) {
                return overlay;
            }
        }

        return null;
    }

    function ensureShopifyInlineButton() {
        const popover = findThemesPopover();
        if (!popover) return;

        if (popover.querySelector('[data-tm-paste-themes-btn]')) return;

        const addItemButton = getAddItemButton(popover);
        if (!addItemButton) return;

        const controlsRow =
            addItemButton.closest('.Polaris-LegacyStack') ||
            addItemButton.parentElement?.parentElement ||
            addItemButton.parentElement;

        if (!controlsRow) return;

        const wrap = document.createElement('div');
        wrap.style.marginLeft = '8px';
        wrap.style.display = 'inline-flex';
        wrap.style.alignItems = 'center';
        wrap.style.gap = '8px';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.tmPasteThemesBtn = '1';
        btn.textContent = 'Paste themes';
        btn.style.appearance = 'none';
        btn.style.border = '1px solid rgba(0,0,0,.15)';
        btn.style.borderRadius = '8px';
        btn.style.background = '#111827';
        btn.style.color = '#fff';
        btn.style.fontSize = '12px';
        btn.style.fontWeight = '700';
        btn.style.padding = '6px 10px';
        btn.style.cursor = 'pointer';

        const status = document.createElement('span');
        status.dataset.tmPasteThemesStatus = '1';
        status.style.fontSize = '12px';
        status.style.color = '#6b7280';
        status.style.whiteSpace = 'nowrap';
        status.style.maxWidth = '200px';
        status.style.overflow = 'hidden';
        status.style.textOverflow = 'ellipsis';

        wrap.appendChild(btn);
        wrap.appendChild(status);

        const targetContainer = controlsRow.lastElementChild || controlsRow;
        targetContainer.appendChild(wrap);

        const setInlineStatus = (msg) => {
            status.textContent = msg || '';
        };

        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, true);

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            setInlineStatus('Reading clipboard...');

            const raw = await readClipboardText();
            const tags = parseTagsFromClipboard(raw);

            if (!tags.length) {
                setInlineStatus('Clipboard empty.');
                return;
            }

            try {
                setInlineStatus(`Adding ${tags.length}...`);
                const result = await fillShopifyThemes(tags);
                setInlineStatus(result.message || 'Done.');
            } catch (err) {
                setInlineStatus(err?.message || 'Failed.');
            }
        }, true);
    }

    function bootShopify() {
        const observer = new MutationObserver(() => {
            ensureShopifyInlineButton();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        ensureShopifyInlineButton();
    }

    function boot() {
        if (IS_ANILIST) bootAniList();
        if (IS_SHOPIFY) bootShopify();
    }

    boot();
})();
