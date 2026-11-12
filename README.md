# TargetVideo Player Debugger

A Chrome extension for quickly debugging TargetVideo players on any web page.

## Features

- **Player info**
  - **Log to console** – logs player configuration and debug data to the browser console.
  - **Show on page** – shows a player info table directly above each player on the page.
- **Tools**
  - **Enable debug / Disable debug** – toggles the player's debug mode (`#debug`) and reloads the page.
  - **Clear local storage** – clears all local storage for the current site (not only player data).

## Installation

1. Download the code:
   - `git clone https://github.com/nikola-dzamic/targetvideo-player-debugger.git`, or
   - on GitHub click **Code → Download ZIP** and extract it.
2. Open `chrome://extensions` in Chrome (or any Chromium browser, e.g. Edge, Brave).
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the extension folder (the one containing `manifest.json`).
5. Optional: pin the extension via the puzzle-piece icon in the toolbar.

**Updating:** pull or download the latest code, then click the reload icon on the extension's card in `chrome://extensions`.

## Usage

Open a page with a TargetVideo player, click the extension icon, and choose an action.