# Tankobonbon External DB Scraping Userscripts

Repository:  
https://github.com/tankobonbon/staff-scripts

Shopify Scripts Folder:  
https://github.com/tankobonbon/staff-scripts/tree/main/db-external


---


# — What are these?

- These userscripts were made to ease the use of external sites for Tankobonbon's database staff.
- Userscripts modify the visual interface of Shopify to show / hide / stylize / autofill elements to improve workflow.
- These scripts **do not collect data** and only affect how the page appears in your browser.


---

# — Installation Guide

1. Install the **Tampermonkey** browser extension: https://www.tampermonkey.net/ (Chrome users can install from the Chrome Web Store.)

2. Enable **Allow User Scripts** in your browser if required. (Guide:  https://www.tampermonkey.net/faq.php#Q209)

3. Install the scripts listed below. Click the **Install link** under each userscript in the **Available Userscripts** section. Tampermonkey will open an installation screen. Click **Install**, then repeat for the remaining scripts.


---

# — Available Userscripts


## MangaUpdates Book Helper

Install (make sure you have Tampermonkey already): https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/mu-book-helper.user.js

- Adds one-click copy buttons above the series title for ID, Title, Original Title, Genres, and Demography.
- Automatically selects the correct Original Title based on the work type (Korean for Manhwa, Chinese for Manhua).
- Formats copied Genres, Demography, and Status with Shopify tag prefixes for quick pasting.
- Includes a shortcut button that opens an Amazon Japan search using the original title.
- Includes a shortcut button for NovelUpdates, CMOA, Anilist, Kyobobook

Notes

Due to the visual similarity between kanji and hanzi, the copied original title may occasionally require manual correction.


---

## Amazon Book Helper

Install (make sure you have Tampermonkey already): https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/amazon-book-helper.user.js

Features:

- Displays a floating helper panel on Amazon book product pages.
- Automatically extracts the Title, Image URL, Synopsis, Contributors, and ISBN-13.
- Provides one-click copy buttons for: Image URL, Synopsis (rich text formatting preserved), Contributors, ISBN-13 (dashless)
- Includes a Refresh button to update the data after switching editions or formats.
- Allows the helper panel to be minimized, closed, and reopened without refreshing the page.
- Automatically cleans and normalizes copied data for easier use in Shopify product listings.

Amazon Region Behavior

- amazon.com: Shows full metadata: synopsis, contributors, ISBN-13, and image URL.
- amazon.co.jp: Image helper mode only (for quickly copying the cover image URL).


---

## Anilist Tags Helper

Install (make sure you have Tampermonkey already): https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/anilist-tags-helper.user.js

Features:

- Adds a floating helper button on AniList anime and manga pages.
- Automatically fetches all tags directly from AniList’s API, including: ID, Regular tags (e.g. Urban Fantasy, Demons, Super Power), Spoiler tags (e.g. Cosmic Horror, Sadism, Cult, etc.)
- Provides one-click copy options for: Line-separated format (for structured input), Comma-separated format (for quick pasting / display)
- Cleans and normalizes tag formatting (no duplicates, trimmed spacing).
- Works consistently across both anime and manga entries.

Shopify Integration:

- Adds an inline “Paste AniList tags” helper inside the Themes metafield popover on collection pages.
- Reads tags directly from clipboard and: Automatically adds each tag as a separate list item, Clicks “Add item” as needed, Skips duplicates if already present
- Prevents the popover from closing while interacting with the helper.

Instructions:
- Open any AniList page (anime or manga).
- Click Copy AniList Tags.
- Go to the corresponding Shopify collection.
- Open the Themes metafield.
- Click Paste AniList tags.


---

## X / Twitter Cleaner

Install (make sure you have Tampermonkey already): https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/twitter-cleaner.user.js

Features:

- Removes right-side clutter including:
  - “What’s happening”
  - “You might like”
  - Suggested users / discovery modules
- Hides navigation items:
  - Chat
  - Grok
  - Creator Studio
  - Premium
- Removes bottom-right floating UI elements:
  - Chat drawer
  - Grok drawer
  - Bottom bar
- Hides reposted tweets from the timeline.
- Expands the main content column to use the freed space.
- Fixes X’s default narrow layout by overriding internal width limits (including the profile timeline container).
- Keeps profile pages stable (no “Something went wrong” crashes from aggressive layout overrides).
- Automatically reapplies all changes as you navigate (SPA-safe via MutationObserver).

Layout Behavior

- Home timeline: widened and cleaned for a more focused feed.
- Profile pages: widened safely without breaking header/tab layout.
- Tweet content: expands to fill available width instead of being capped at ~600px.

Notes

- X uses dynamic class names (like `r-1ye8kvj`), so layout fixes may occasionally break if they change their internal styles.
- This script avoids overly aggressive DOM removal to prevent page crashes.
- Designed for a “tweets-only” browsing experience — minimal distractions, maximum timeline.


---

## Highlight Manga Search Launcher

Install (make sure you have Tampermonkey already):  https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/highlighter-search.user.js

Features:

- Displays a floating search menu when you highlight any text.
- Works across multiple sites including:
  - Anime News Network
  - Twitter / X
  - Publisher sites (Seven Seas, Yen Press, Kodansha, VIZ, Square Enix, etc.)
  - AniList, MAL, MangaUpdates, CMOA
- One-click search across multiple platforms:
  - MangaUpdates
  - AniList
  - MyAnimeList
  - Amazon (US)
  - Amazon Japan
  - CMOA
- Automatically encodes selected text (handles spaces, symbols, etc.)
- Opens results in a new tab for fast multi-search workflow.
- Press `ESC` or click outside to close the menu.

Supported Searches:

- **MangaUpdates** → Licensed series search  
- **AniList** → Manga search  
- **MyAnimeList** → Manga database search  
- **Amazon (US)** → Books category search  
- **Amazon JP** → Japanese books search  
- **CMOA** → Japanese digital manga store search  


---

## Publisher Helper

Install (make sure you have Tampermonkey already):
- https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/viz-book-helper.user.js
- https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/yenpress-book-helper.user.js
- https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/sevenseas-book-helper.user.js
- https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-external/kodansha-book-helper.user.js

Feature:

- Displays a compact floating copy-helper on the bottom-right of the page.
- One-click formats and copies:
  - Page count
  - Age rating
  - Publisher
  - Imprint
  - ISBN
  - Release date
 
Note:

- VIZ and Yen doesn't have ISBN and Release date buttons at the moment.
- More publishers are planned to be added in the future.


---

# — Usage

- Scripts load automatically when external pages refresh.
- If a script does not appear immediately, simply **refresh the page once**.
- Scripts can be enabled or disabled in the **Tampermonkey Dashboard**.
- You can uninstall the Tampermonkey extension if you no longer need these tools.


---

# — Updates

- Scripts are distributed through this repository.
- When updates are released, Tampermonkey can automatically update them.
- You can also manually check updates from: Tampermonkey → **Check for Userscript Updates**


---

# — Notes

- Amazon occasionally changes its admin interface.
- If a script stops working due to layout changes, an updated version will be released.
