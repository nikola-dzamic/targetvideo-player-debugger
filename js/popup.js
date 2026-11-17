const statusEl = document.getElementById("bplrStatus");
const playerInfoBtn = document.getElementById("bplrPlayerInfo");
const playerInfoEmbedBtn = document.getElementById("playerInfoEmbed");
const enableDebugBtn = document.getElementById("enableDebug");
const clearStorageBtn = document.getElementById("clearBplrLocalStorage");
const allButtons = [playerInfoBtn, playerInfoEmbedBtn, enableDebugBtn, clearStorageBtn];

let currentTab = null;
let pageState = null; // { hasPlayerScript, playerCount, widgetType, widgetDataCount, debugOn }
let widgetInfoOnly = false;

// Runs inside the page's own JS world (world: "MAIN") so it can see the
// BPLR / Brid globals. It is serialized, so it can't use anything from this file.
function bplrGetPageState() {
  const playerSelector =
    "div[id^=TargetVideo_].bplr, div[id^=Brid_].bplr, div[id^=TargetVideo_].brid, div[id^=Brid_].brid, " +
    "div[id^=Step-network_].bplr, div[id^=Step-network_].brid, div#BPLR_Single_Embed.bplr, div#Brid_Single_Embed.brid, " +
    "div[id^=Player_].bplr, div[id^=bplr-shorts-player-].bplr";
  const widgetSelector =
    "div[class$=-playlist-widget], div[class$=-mid-article-widget], div[class$=-native-widget], div[class$=-simple-widget-wrapper-main]";

  let playerCount = document.querySelectorAll(playerSelector).length;
  if (playerCount === 0) playerCount = document.querySelectorAll(widgetSelector).length;

  // Widgets that load the player script only when a video is opened ("lightbox"), or never ("noPlayer").
  // Only check that they exist: $bs and $td create a new widget when called.
  let widgetType = null;
  if (typeof BPLRLightboxWidgetInstances !== "undefined" || (typeof $bs === "function" && document.querySelector(".bplr-shorts-container"))) {
    widgetType = "lightbox";
  } else if ((typeof $td === "function" && document.querySelector(".bplr-td-holder")) || (typeof ReelCards === "object" && ReelCards && typeof ReelCards.ReelCards === "function")) {
    widgetType = "noPlayer";
  }

  // The widget's own data request, which widgetInfo.js reads when there's no player.
  const widgetDataCount = performance.getEntriesByType("resource").filter((e) => /\/services\/get\/widget\//.test(e.name)).length;

  return {
    hasPlayerScript: typeof BPLR !== "undefined" || typeof Brid !== "undefined",
    playerCount: playerCount,
    widgetType: widgetType,
    widgetDataCount: widgetDataCount,
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

  const { hasPlayerScript, playerCount, widgetType, widgetDataCount, debugOn } = pageState;
  // No player, but a widget whose data request we can read: the info buttons use widgetInfo.js.
  // Checks playerCount, not hasPlayerScript: some sites load the player script but only use a reels widget.
  widgetInfoOnly = playerCount === 0 && widgetType !== null && widgetDataCount > 0;

  if (playerCount === 0 && widgetType !== null && widgetDataCount === 0) {
    statusEl.textContent = "TargetVideo widget found, but its data request isn't in the page's network log. Reload the page and try again";
  } else if (widgetInfoOnly && widgetType === "lightbox") {
    statusEl.textContent = "Lightbox widget: widget info only. For full player info, open a video in it, then open this popup again";
  } else if (widgetInfoOnly) {
    statusEl.textContent = "Widget info only. Reels and traffic driver widgets have no player on the page";
  } else if (!hasPlayerScript) {
    statusEl.textContent = "No TargetVideo player on this page. Players inside iframes aren't supported";
  } else if (playerCount === 0) {
    statusEl.textContent = "Player script is loaded, but no player was found on the page yet";
  } else {
    statusEl.textContent = plural(playerCount, "player") + " found on this page";
  }

  playerInfoBtn.disabled = !hasPlayerScript && !widgetInfoOnly;
  playerInfoEmbedBtn.disabled = !hasPlayerScript && !widgetInfoOnly;
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
// `mode` is passed to the script as data-bplr-mode (widgetInfo.js: "console" or "table").
// Runs in the isolated world, where chrome.runtime.getURL is available.
function bplrInjectFiles(scriptPath, cssPath, mode) {
  const root = document.head || document.documentElement;
  if (cssPath) {
    const c = document.createElement("link");
    c.rel = "stylesheet";
    c.href = chrome.runtime.getURL(cssPath);
    root.appendChild(c);
  }
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL(scriptPath);
  if (mode) s.dataset.bplrMode = mode;
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
  if (widgetInfoOnly) {
    runInTab(bplrInjectFiles, ["js/widgetInfo.js", null, "console"], "Logged widget info to the browser console (F12)");
    return;
  }
  const n = pageState.playerCount;
  runInTab(
    bplrInjectFiles,
    ["js/info.js"],
    n > 0 ? "Logged " + plural(n, "player") + " to the browser console (F12)" : "Check the browser console (F12) for details"
  );
});

playerInfoEmbedBtn.addEventListener("click", () => {
  if (widgetInfoOnly) {
    runInTab(bplrInjectFiles, ["js/widgetInfo.js", "css/info-table.css", "table"], "Widget info table added above the widget");
    return;
  }
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
