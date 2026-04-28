# Tankobonbon Shopify Userscripts

Repository:  
https://github.com/tankobonbon/staff-scripts

Shopify Scripts Folder:  
https://github.com/tankobonbon/staff-scripts/tree/main/db-legacy


---


# — What are these?

- These userscripts were made to ease the use of Shopify for Tankobonbon's database staff.
- Userscripts modify the visual interface of Shopify to show / hide / stylize / autofill elements to improve workflow.
- These scripts **do not collect data** and only affect how the page appears in your browser.


---

# — Installation Guide

1. Install the **Tampermonkey** browser extension: https://www.tampermonkey.net/ (Chrome users can install from the Chrome Web Store.)

2. Enable **Allow User Scripts** in your browser if required. (Guide:  https://www.tampermonkey.net/faq.php#Q209)

3. Install the scripts listed below. Click the **Install link** under each userscript in the **Available Userscripts** section. Tampermonkey will open an installation screen. Click **Install**, then repeat for the remaining scripts.


---

# — Available Userscripts


## Add Tags

Install (make sure you have Tampermonkey already): https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-legacy/tag-helper.user.js

- Adds one-click buttons for commonly used tag groups when adding tags to books.


---

## Duplicate Product

Install (make sure you have Tampermonkey already): https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-legacy/duplicate-helper.user.js

Features:

- Automatically unchecks all fields (Shopify checks everything by default).
- Extends the duplicate popup window width.
- Removes the `" (Copy)"` text Shopify automatically adds.
- Automatically increments the volume number.
- Provides additional number editing tools.
- Automatically sets the product status to **Active** instead of **Draft**.


---

## Product Edit

Install (make sure you have Tampermonkey already): https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-legacy/product-form-cleaner.user.js

Features:

- Hides irrelevant Shopify sections (channels, sales, shipping, etc.).
- Widens the product form layout.
- Adds **Clear** and **Trim** buttons for the description field.
- Adds quick tag buttons for **Cover not final** and **Lounge**.
- Highlights 'Cover not final' / 'Lounge' / 'Class_Debut' / 'Class_Standalone' more prominently if they're already tagged.
- Moves **SKU / Barcode / Handle** fields together.
- Adds **Autofill SKU → Barcode + Handle** button.
- Adds a **Scroll to Top** button at the bottom of the page.


---

## Media Helper

Install (make sure you have Tampermonkey already): https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-legacy/media-helper.user.js

Features:

- Automatically opens the URL input field when selecting **Select Existing**.


---

## Shopify Floater for Collections

Install (make sure you have Tampermonkey already): https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-legacy/shopify-floater-for-collections.user.js

- Adds one-click buttons to open Anilist and MangaUpdates based on the provided ID metafields.


---

## Shopify Floater for Products

Install (make sure you have Tampermonkey already): https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-legacy/shopify-floater-for-products.user.js

- Adds one-click buttons to open Amazon and Amazon JP based on the provided SKU and original title metafields.


---


# — Usage

- Scripts load automatically when Shopify pages refresh.
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

- Shopify occasionally changes its admin interface.
- If a script stops working due to layout changes, an updated version will be released.
