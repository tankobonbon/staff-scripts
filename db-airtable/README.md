# Tankobonbon Airtable Userscripts

Repository:  
https://github.com/tankobonbon/staff-scripts

Airtable Scripts Folder:  
https://github.com/tankobonbon/staff-scripts/tree/main/db-airtable


---


# — What are these?

- These userscripts were made to ease the use of Airtable for Tankobonbon's database staff.
- Userscripts modify the visual interface of Airtable to add helper tools and improve workflow.
- These scripts **do not collect data** and only affect how the page appears in your browser.


---


# — Installation Guide

1. Install the **Tampermonkey** browser extension: https://www.tampermonkey.net/ (Chrome users can install from the Chrome Web Store.)

2. Enable **Allow User Scripts** in your browser if required. (Guide: https://www.tampermonkey.net/faq.php#Q209)

3. Install the scripts listed below. Click the **Install link** under each userscript in the **Available Userscripts** section. Tampermonkey will open an installation screen. Click **Install**, then repeat for the remaining scripts.


---


# — Available Userscripts


## New Volume Helper

Install (make sure you have Tampermonkey already):  
https://github.com/tankobonbon/staff-scripts/raw/refs/heads/main/db-airtable/new-volume-helper.user.js


Features:

- Adds a helper panel inside the expanded record view in Airtable Interface.
- Provides one-click buttons for:
  - **Copy title**
  - **Copy ISBN**
  - **Copy Shopify-friendly date**
- Ensures copied values are clean and do not include Airtable formatting text (e.g. “Format: Integer”).
- Adds a **Ctrl + Open tabs** button that opens relevant links based on workflow logic:
  - If **Previous Volume Number is blank**:
    - Amazon link
    - MangaUpdates
    - Publisher Page Search
    - Shopify
  - If **Previous Volume Number is not blank**:
    - Amazon link
    - Amazon JP Search
    - Shopify
- Displays a tooltip feedback message for each action (copying or opening tabs).
- Styled as a separate, visually distinct panel to avoid interfering with Airtable’s interface.


---


# — Usage

- Open the Airtable Interface and click a record to expand its details.
- The helper panel will appear above the title.
- Use the buttons to copy values or open required tabs.
- Hold **Ctrl (or Cmd on Mac)** before clicking **Open tabs** to open links in the background.
- If the panel does not appear immediately, refresh the page once.


---


# — Updates

- Scripts are distributed through this repository.
- When updates are released, Tampermonkey can automatically update them.
- You can also manually check updates from: Tampermonkey → **Check for Userscript Updates**


---


# — Notes

- Airtable may update its interface structure over time.
- If a script stops working due to layout changes, an updated version will be released.
