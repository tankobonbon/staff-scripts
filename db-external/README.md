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

- Adds one-click copy buttons above the series title for Title, Original Title, Genres, and Demography.
- Automatically selects the correct Original Title based on the work type (Korean for Manhwa, Chinese for Manhua).
- Formats copied Genres, Demography, and Status with Shopify tag prefixes for quick pasting.
- Includes a shortcut button that opens an Amazon Japan search using the original title.

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
- Automatically fetches all tags directly from AniList’s API, including: Regular tags (e.g. Urban Fantasy, Demons, Super Power), Spoiler tags (e.g. Cosmic Horror, Sadism, Cult, etc.)
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
