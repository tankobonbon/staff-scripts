// ==UserScript==
// @name         J-WID Copy Work Code + ISWC + Close Tab
// @namespace    https://tampermonkey.com
// @version      1.0
// @description  Copy the visible JASRAC work code and ISWC as two tab-separated cells, then close the tab.
// @match        https://www2.jasrac.or.jp/eJwid/*
// @grant        GM_setClipboard
// @run-at       document-idle
// @updateURL    https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/library-tools/jasrac-code-copier.user.js
// @downloadURL  https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/library-tools/jasrac-code-copier.user.js
// ==/UserScript==

// 【注意事項】
// 本スクリプトは、ユーザーが手動で開いたJ-WIDの作品詳細画面に表示されている
// 「作品コード」および「ISWC」を、ユーザー自身の操作によりクリップボードへコピーするための補助ツールです。
// 自動検索、連続アクセス、データ収集、スクレイピング、外部送信等は一切行いません。
// J-WIDおよびJASRACの利用条件を遵守し、個人の確認作業を補助する目的でのみ使用してください。

(() => {
    'use strict';

    const BUTTON_ID = 'tbb-jasrac-copy-codes';
    const STYLE_ID = 'tbb-jasrac-copy-style';
    const CLOSE_DELAY_MS = 350;

    const clean = (value) => value?.replace(/\s+/g, ' ').trim() || '';

    function getCodes() {
        return {
            workCode: clean(document.querySelector('.baseinfo--code strong')?.textContent),
            iswc: clean(document.querySelector('.baseinfo--iswc strong')?.textContent),
        };
    }

    function copyText(text) {
        if (typeof GM_setClipboard === 'function') {
            GM_setClipboard(text, 'text');
            return Promise.resolve();
        }

        return navigator.clipboard.writeText(text);
    }

    function closeCurrentTab() {
        window.close();
    }

    function addStyle() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${BUTTON_ID} {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
                min-height: 40px;
                margin: 14px 0 0;
                padding: 9px 16px;
                border: 0;
                border-radius: 7px;
                background: #6956a8;
                color: #fff;
                font: 700 14px/1.2 Arial, sans-serif;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(0, 0, 0, .18);
                transition: opacity .15s ease, transform .15s ease, background .15s ease;
            }

            #${BUTTON_ID}:hover {
                background: #58468f;
                transform: translateY(-1px);
            }

            #${BUTTON_ID}:active {
                transform: translateY(0);
            }

            #${BUTTON_ID}[disabled] {
                cursor: default;
                opacity: .65;
                transform: none;
            }
        `;
        document.head.appendChild(style);
    }

    function installButton() {
        const { workCode, iswc } = getCodes();
        const baseInfo = document.querySelector('.baseinfo');

        if (!baseInfo || !workCode) return;

        const existing = document.getElementById(BUTTON_ID);
        if (existing) {
            existing.title = `作品コード: ${workCode}\nISWC: ${iswc || 'なし'}`;
            return;
        }

        addStyle();

        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.type = 'button';
        button.textContent = 'COPY CODES + CLOSE TAB';
        button.title = `作品コード: ${workCode}\nISWC: ${iswc || 'なし'}`;

        button.addEventListener('click', async () => {
            const current = getCodes();
            const text = `${current.workCode}\t${current.iswc}`;

            try {
                await copyText(text);

                button.textContent = current.iswc
                    ? 'COPIED - CLOSING TAB'
                    : 'COPIED - NO ISWC - CLOSING';
                button.disabled = true;

                window.setTimeout(closeCurrentTab, CLOSE_DELAY_MS);
                window.setTimeout(() => {
                    if (!document.hidden) {
                        button.textContent = 'COPIED - CLOSE BLOCKED';
                        button.disabled = false;
                    }
                }, 1200);
            } catch (error) {
                console.error('J-WID copy failed:', error);
                button.textContent = 'COPY FAILED';

                window.setTimeout(() => {
                    button.textContent = 'COPY CODES + CLOSE TAB';
                    button.disabled = false;
                }, 1600);
            }
        });

        baseInfo.insertAdjacentElement('afterend', button);
    }

    installButton();

    const observer = new MutationObserver(() => installButton());
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
})();
