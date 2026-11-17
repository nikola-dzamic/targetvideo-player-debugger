# TargetVideo Player Debugger

A Chrome extension for quickly debugging TargetVideo players on any web page.

## Features

- **Player info**
  - **Log to console** – logs player configuration and debug data to the browser console.
  - **Show on page** – shows a player info table directly above each player on the page.
    - Widgets with no player on the page (reels, OTT traffic driver, and lightbox widgets before a video is opened) get widget info instead: partner, player, playlist and video IDs. Open a video in a lightbox widget for full player info.
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

Open a page with a TargetVideo player, click the extension icon, and choose an action. The line under the logo says what was found on the page (players, widget, or nothing) and what to do next.

## Limitations

- Players inside iframes aren't supported.
- Lightbox widgets show full player info only after a video is opened in them. Open the video first, then open the extension again.
- If a page has both a player and a reels or traffic driver widget, only the player is shown.
- Widget info needs the widget's data request in the page's network log. On pages with a lot of network requests it can be missing; reload the page and try again.