const statusEl = document.getElementById("bplrStatus");
const playerInfoBtn = document.getElementById("bplrPlayerInfo");
const playerInfoEmbedBtn = document.getElementById("playerInfoEmbed");
const enableDebugBtn = document.getElementById("enableDebug");
const clearStorageBtn = document.getElementById("clearBplrLocalStorage");
const allButtons = [playerInfoBtn, playerInfoEmbedBtn, enableDebugBtn, clearStorageBtn];

let currentTab = null;
let pageState = null; // { hasPlayerScript, playerCount, debugOn }

// Runs inside the page's own JS world (world: "MAIN") so it can see the
// BPLR / Brid globals. It is serialized, so it can't use anything from this file.
function bplrGetPageState() {
  const playerSelector =
    "div[id^=TargetVideo_].bplr, div[id^=Brid_].bplr, div[id^=TargetVideo_].brid, div[id^=Brid_].brid, " +
    "div[id^=Step-network_].bplr, div[id^=Step-network_].brid, div#BPLR_Single_Embed.bplr, div#Brid_Single_Embed.brid";
  const widgetSelector =
    "div[class$=-playlist-widget], div[class$=-mid-article-widget], div[class$=-native-widget], div[class$=-simple-widget-wrapper-main]";

  let playerCount = document.querySelectorAll(playerSelector).length;
  if (playerCount === 0) playerCount = document.querySelectorAll(widgetSelector).length;

  return {
    hasPlayerScript: typeof BPLR !== "undefined" || typeof Brid !== "undefined",
    playerCount: playerCount,
    debugOn: location.hash === "#BPLREnableDebug" || location.hash === "#BridEnableDebug",
  };
}

function plural(n, word) {
  return n + " " + word + (n === 1 ? "" : "s");
}

function render() {
  if (!pageState) {
    statusEl.textContent = "Can't run on this page. Browser pages and the Chrome Web Store are blocked";
    allButtons.forEach((btn) => (btn.disabled = true));
    return;
  }

  const { hasPlayerScript, playerCount, debugOn } = pageState;

  if (!hasPlayerScript) {
    statusEl.textContent = "No TargetVideo player on this page. Players inside iframes aren't supported";
  } else if (playerCount === 0) {
    statusEl.textContent = "Player script is loaded, but no player was found on the page yet";
  } else {
    statusEl.textContent = plural(playerCount, "player") + " found on this page";
  }

  playerInfoBtn.disabled = !hasPlayerScript;
  playerInfoEmbedBtn.disabled = !hasPlayerScript;
  clearStorageBtn.disabled = false;

  enableDebugBtn.textContent = debugOn ? "Disable debug" : "Enable debug";
  enableDebugBtn.title = debugOn ? "Turn off debug mode and reload" : "Turn on debug mode and reload";
  // Turning debug on needs the player script; turning it off only needs the hash removed.
  enableDebugBtn.disabled = !hasPlayerScript && !debugOn;
}

async function init() {
  // Keep buttons off until we know what the page supports.
  allButtons.forEach((btn) => (btn.disabled = true));
  try {
    [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      world: "MAIN",
      func: bplrGetPageState,
    });
    pageState = res && res.result ? res.result : null;
  } catch (e) {
    pageState = null;
  }
  render();
}

// Injects one of the extension's scripts (and optionally a stylesheet) into the page.
// Runs in the isolated world, where chrome.runtime.getURL is available.
function bplrInjectFiles(scriptPath, cssPath) {
  const root = document.head || document.documentElement;
  if (cssPath) {
    const c = document.createElement("link");
    c.rel = "stylesheet";
    c.href = chrome.runtime.getURL(cssPath);
    root.appendChild(c);
  }
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL(scriptPath);
  s.onload = function () {
    this.remove();
  };
  root.appendChild(s);
}

function bplrClear() {
  localStorage.clear();
}

async function runInTab(func, args, successMessage) {
  try {
    await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, func: func, args: args || [] });
    showNotice(successMessage);
    return true;
  } catch (e) {
    showNotice("Couldn't run on this page");
    return false;
  }
}

playerInfoBtn.addEventListener("click", () => {
  const n = pageState.playerCount;
  runInTab(
    bplrInjectFiles,
    ["js/info.js"],
    n > 0 ? "Logged " + plural(n, "player") + " to the browser console (F12)" : "Check the browser console (F12) for details"
  );
});

playerInfoEmbedBtn.addEventListener("click", () => {
  const n = pageState.playerCount;
  runInTab(
    bplrInjectFiles,
    ["js/playerInfoEmbed.js", "css/info-table.css"],
    n > 1 ? "Info table added above " + plural(n, "player") : "Info table added above the player"
  );
});

enableDebugBtn.addEventListener("click", async () => {
  const turningOn = !pageState.debugOn;
  const ok = await runInTab(
    bplrInjectFiles,
    ["js/enableDebug.js"],
    turningOn ? "Debug mode on. Reloading page…" : "Debug mode off. Reloading page…"
  );
  if (ok) {
    pageState.debugOn = turningOn;
    render();
  }
});

clearStorageBtn.addEventListener("click", () => {
  runInTab(bplrClear, [], "Local storage cleared for this site");
});

init();
