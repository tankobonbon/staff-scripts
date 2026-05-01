// ==UserScript==
// @name         X / Twitter Cleaner
// @namespace    https://tankobonbon.com/
// @version      1.0
// @description  Cleans up X by hiding reposts, clutter, bottom-right drawers, and widening the main feed/profile timeline.
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/twitter-cleaner.user.js
// @downloadURL  https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/twitter-cleaner.user.js
// ==/UserScript==

(function () {
    'use strict';

    const STYLE_ID = 'tankobonbon-x-cleaner-style';
    const HIDDEN_ATTR = 'data-tankobonbon-hidden';

    function hide(el) {
        if (!el || el.hasAttribute(HIDDEN_ATTR)) return;
        el.setAttribute(HIDDEN_ATTR, '1');
        el.style.setProperty('display', 'none', 'important');
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
      [data-testid="sidebarColumn"] {
        display: none !important;
      }

      [data-testid="GrokDrawer"],
      [data-testid="chat-drawer-root"],
      [data-testid="BottomBar"] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }

      main[role="main"] > div,
      main[role="main"] > div > div,
      main[role="main"] > div > div > div {
        max-width: none !important;
      }

      [data-testid="primaryColumn"] {
        flex: 1 1 auto !important;
        width: auto !important;
        max-width: min(1180px, calc(100vw - 290px)) !important;
      }

      .r-1ye8kvj,
      .r-f8sm7e.r-13qz1uu.r-1ye8kvj {
        max-width: min(1280px, calc(100vw - 290px)) !important;
      }

      @media (min-width: 1280px) {
        [data-testid="primaryColumn"] {
          max-width: min(1280px, calc(100vw - 290px)) !important;
        }
      }

      [data-testid="primaryColumn"] header,
      [data-testid="primaryColumn"] [role="tablist"] {
        max-width: 100% !important;
      }

      article[role="article"] {
        max-width: 100% !important;
        width: 100% !important;
      }

      article[role="article"] > div,
      article[role="article"] > div > div {
        max-width: 100% !important;
      }

      article[role="article"] div[data-testid="tweetText"] {
        max-width: 100% !important;
      }

      article[role="article"] [data-testid="tweetPhoto"],
      article[role="article"] [data-testid="videoPlayer"],
      article[role="article"] [data-testid="card.wrapper"] {
        max-width: 100% !important;
        width: 100% !important;
      }

      [aria-label*="timeline" i],
      [aria-label*="Timeline" i] {
        max-width: 100% !important;
      }

      [data-testid="primaryColumn"] > div,
      [data-testid="primaryColumn"] > div > div,
      [data-testid="primaryColumn"] > div > div > div {
        max-width: 100% !important;
      }
    `;
      document.head.appendChild(style);
  }

    function hideNavItems() {
        const nav = document.querySelector('nav[aria-label="Primary"]');
        if (!nav) return;

        nav.querySelectorAll('a, button').forEach(node => {
            const text = (node.textContent || '').trim().toLowerCase();
            const aria = (node.getAttribute('aria-label') || '').trim().toLowerCase();
            const href = node.getAttribute('href') || '';
            const testId = node.getAttribute('data-testid') || '';

            const shouldHide =
                  text === 'chat' ||
                  text === 'grok' ||
                  text === 'creator studio' ||
                  text === 'premium' ||
                  aria === 'chat' ||
                  aria === 'grok' ||
                  aria === 'creator studio' ||
                  aria === 'premium' ||
                  href.includes('/i/chat') ||
                  href.includes('/i/grok') ||
                  href.includes('/i/jf/creators/studio') ||
                  href.includes('/i/premium_sign_up') ||
                  testId === 'premium-signup-tab';

            if (shouldHide) {
                hide(node.closest('a, button') || node);
            }
        });
    }

    function hideReposts() {
        document.querySelectorAll('article[role="article"]').forEach(article => {
            const socialContext = article.querySelector('[data-testid="socialContext"]');
            if (socialContext && /reposted/i.test(socialContext.textContent || '')) {
                hide(article);
                return;
            }

            const topText = (article.innerText || '').split('\n').slice(0, 3).join(' ');
            if (/\breposted\b/i.test(topText)) {
                hide(article);
            }
        });
    }

    function hideBottomRightStuff() {
        document.querySelectorAll(
            '[data-testid="GrokDrawer"], [data-testid="chat-drawer-root"], [data-testid="BottomBar"]'
        ).forEach(hide);
    }

    function clean() {
        injectStyles();
        hideNavItems();
        hideBottomRightStuff();
        hideReposts();
    }

    let scheduled = false;
    function scheduleClean() {
        if (scheduled) return;
        scheduled = true;

        requestAnimationFrame(() => {
            scheduled = false;
            clean();
        });
    }

    function init() {
        clean();

        const observer = new MutationObserver(() => {
            scheduleClean();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
