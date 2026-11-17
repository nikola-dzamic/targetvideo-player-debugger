checkIfOutstream = (player) => {
  // Deki said if the name attribute of the player object has "OSPlayer" in it, this is an outstream. Only way to differentiate between an outstream and player. True for outstream, false for player.
  return player.name.includes("OSPlayer") ? true : false
}

checkIfCarousel = (player) => {
  return player.hasOwnProperty('Carousel')
}

/*
// TODO: Started working on friendly iframe detection
var i, frames;
frames = document.getElementsByTagName("iframe");
for (i = 0; i < frames.length; ++i)
{
  //console.log(frames[i])
  var innerDoc = frames[i].contentDocument || frames[i].contentWindow.document;
  //console.log(innerDoc);

}
*/

// Same player divs as playerInfoEmbed.js. `var` (not const/let) so injecting this script again doesn't throw a redeclaration error.
var bplrPlayerSelector = 'div[id^=TargetVideo_].bplr, div[id^=Brid_].bplr, div[id^=TargetVideo_].brid, div[id^=Brid_].brid, div[id^=Step-network_].bplr, div[id^=Step-network_].brid, div#BPLR_Single_Embed.bplr, div#Brid_Single_Embed.brid';
var bplrAccent = "color:#11988d;font-weight:bold;";

// TODO: Add support here for players located in friendly iframes. This is gonna be sex.
if (typeof BPLR === "undefined" && typeof Brid === "undefined") {
  console.log("No TargetVideo player found on this page. If the player is in an iframe, this debug script can't read its data.");
} else if (typeof bplrPlayers !== "undefined") {
  console.log("Script already run! Exiting gracefully.");
} else if (document.querySelectorAll(bplrPlayerSelector).length === 0) {
  // Don't set bplrPlayers here, so a later click can try again once the player has loaded.
  console.log("TargetVideo player script found, but no player on the page yet. Try again once the player has loaded. If the player is in an iframe, this debug script can't read its data.");
} else {
  bplrPlayers = document.querySelectorAll(bplrPlayerSelector);

  for (let i = 0; i < bplrPlayers.length; i++) {
    bplrLogPlayer($bp(bplrPlayers[i].id), i + 1);
  }
}

// Logs one player, grouped the same way as the info table (playerInfoEmbed.js).
function bplrLogPlayer(player, number) {
  let config = player.config;
  let video = player.currentSource || {};
  let isOutstream = checkIfOutstream(player);

  console.group(`%cPlayer ${number}: ${player.id}`, `${bplrAccent}font-size:14px;`);

  if (isOutstream) {
    console.log("%cOutstream player", bplrAccent);
  }

  bplrLogGroup("Account", [
    ["Partner domain:", config.Partner?.domain_short],
    ["Partner ID:", config.partner_id],
    ["User ID:", config.Partner?.user_id]
  ]);

  bplrLogGroup("Player", [
    ["Player ID:", config.id],
    ["Player template ID:", config.player_template_id],
    ["Mode:", config.mode],
    ["Player size:", `${config.width} x ${config.height}`],
    ["Start volume:", `${config.start_volume}%`],
    ["Autoplay:", `${config.autoplay} (in view: ${config.autoplayInview}, ${config.autoplayInviewPct}%)`],
    ["Sticky:", `${config.slide_inview} (mobile disabled: ${config.slide_inview_mobile})`],
    ["Plugins:", (config.Plugin || []).map(plugin => plugin?.id ?? plugin)]
  ]);

  if (!isOutstream) {
    if (!player.videos || player.videos.length === 0) {
      console.log("%cVideo list is empty. No videos to display. Check for content GEO targeting.", bplrAccent);
    } else {
      let sd = video.source?.sd || "";
      let contentRows = [
        ...(config.mode === "widget" ? [["Widget ID:", config.playlist?.id || "/"]] : []),
        // In widget mode config.playlist is an object holding the widget ID, not the playlist ID, so skip it.
        ["Playlist ID:", config.Playlist?.id || (typeof config.playlist === "object" ? "" : config.playlist) || "/"],
        ["Video ID:", video.id],
        ["Video origin:", video.origin_video || "/"],
        ["Hosted:", sd.includes("cdn.bplr.tv") ? "internally" : "externally"],
        ["Stream type:", video.source?.hasOwnProperty('streaming') || sd.includes(".m3u8") ? "STREAMING/HLS" : "VOD/MP4"],
        ["Mime type:", video.mimeType],
        ["Renditions:", Object.keys(video.source || {})]
      ];

      if (checkIfCarousel(player)) {
        contentRows.push(["Carousel ID:", player.assets.carousel]);
        contentRows.push(["Carousel JSON:", `${player.assets.URLconfig.service}/services/get/carousel/${config.id}/${player.assets.carousel}.json`]);
      }

      bplrLogGroup("Content", contentRows);
    }
  }

  bplrLogGroup("Ads", [
    ["Monetize:", config.monetize],
    ["Ad SDK:", config.adSDK || "/"],
    ["Ad schedule ID:", config.ad_schedule_id || "/"],
    ["Ad schedule ID (Video):", video.ad_schedule_id || "/"],
    ["Ad types:", [
      ["Pre-roll", player.hasPreroll],
      ["Mid-roll", player.hasMidroll],
      ["Post-roll", player.hasPostroll],
      ["Overlay", player.hasOverlay],
      ["Banner", player.hasBanner]
    ].filter(([, on]) => on).map(([name]) => name)],
    ["Waits for consent:", [
      ["TCF", config.wait_tcf_api],
      ["GPP", config.wait_gpp_api]
    ].filter(([, on]) => on).map(([name]) => name)]
  ]);

  if (config.AdSchedule?.length) {
    console.groupCollapsed("Ad schedule objects");
    config.AdSchedule.forEach(schedule => console.dir(schedule));
    console.groupEnd();
  }

  bplrLogGroup("Details", [
    ["Tags:", video.tags || "/"],
    ["IAB categories:", video.iab_categories || "/"],
    ["JSON:", isOutstream ? `${player.assets.URLconfig.service}/services/unit/${config.id}.json` : bplrGetJsonUrl(player)]
  ]);

  console.groupCollapsed("Full player object");
  console.log(player);
  console.groupEnd();

  console.groupEnd();
}

// One console group of "Label: value" lines, with the value in bold. Arrays are joined, an empty one shows "/".
function bplrLogGroup(name, rows) {
  console.group(`%c${name}`, bplrAccent);

  rows.forEach(([label, value]) => {
    if (Array.isArray(value)) {
      value = value.length ? value.join(", ") : "/";
    }
    console.log(`${label} %c${value}`, "font-weight: bold;");
  });

  console.groupEnd();
}

// Same JSON URL as the info table (getJsonUrl in playerInfoEmbed.js).
function bplrGetJsonUrl(player) {
  let config = player.config;
  let urlEnv = `${player.assets.URLconfig.service}/${player.assets.URLconfig.dynamic}`;
  let urlConfig = `${config.mode}/${config.id}`;

  switch (config.mode) {
    case "video":
      return `${urlEnv}${urlConfig}/${player.currentSource.id}.json`;
    case "playlist":
      return `${urlEnv}${urlConfig}/${config.Playlist?.id || config.playlist}.json`;
    case "latest":
      return `${urlEnv}${urlConfig}/0/1/25/0.json`;
    case "widget":
      return `${urlEnv}${urlConfig}/${config.playlist.id}/1/25.json`;
    case "config":
      return `${urlEnv}video/${config.id}/${player.currentSource.id}.json`;
    case "matched_videos":
      return `${player.assets.URLconfig.service}/fetch_matching_config/${config.id}/${config.partner_id}.json`;
    default:
      return "Not able to get JSON url.";
  }
}
