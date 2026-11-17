// Widget info for widgets that have no player on the page: reels, OTT traffic driver,
// and lightbox widgets before a video is opened. There's no $bp() to read, so this finds the
// widget's own data request (services/get/widget/...) in the page's network log, downloads it
// again, and logs it to the console or shows it as a table above the widget.
// popup.js sets data-bplr-mode="console" or "table" on this script's tag.

// `var` (not const/let) so injecting this script again doesn't throw a redeclaration error.
var bplrWidgetMode = (document.currentScript && document.currentScript.dataset.bplrMode) || "console";
var bplrWidgetAccent = "color:#11988d;font-weight:bold;";

bplrShowWidgetInfo();

function bplrShowWidgetInfo() {
  let urls = performance.getEntriesByType("resource")
    .map(entry => entry.name)
    .filter(url => /\/services\/get\/widget\//.test(url));
  urls = urls.filter((url, i) => urls.indexOf(url) === i);

  if (urls.length === 0) {
    console.log("No TargetVideo widget data request found in the page's network log. Reload the page and try again.");
    return;
  }
  if (bplrWidgetMode === "table" && document.querySelector("table.infoTable[data-bplr-widget]")) {
    console.log("Script already run! Exiting gracefully.");
    return;
  }

  // URL: .../services/get/widget/<player ID>/<widget ID>[/1/25].json
  let items = urls.map(url => {
    let match = url.match(/\/services\/get\/widget\/[^/]+\/([^/.?]+)/);
    return { url: url, widgetId: match ? match[1] : "/", widget: null };
  });

  // Standard lightboxes carry their widget ID in a class name. Pair the rest with the requests in page order.
  let widgets = bplrFindWidgets();
  items.forEach(item => {
    item.widget = widgets.find(w => !w.used && w.widgetId === item.widgetId) || null;
    if (item.widget) item.widget.used = true;
  });
  let unpaired = widgets.filter(w => !w.used);
  items.filter(item => !item.widget).forEach((item, i) => {
    item.widget = unpaired[i] || null;
  });

  items.forEach((item, i) => {
    fetch(item.url)
      .then(response => response.json())
      .then(data => {
        let groups = bplrWidgetGroups(data, item);
        if (bplrWidgetMode === "table") {
          bplrInsertWidgetTable(groups, item);
        } else {
          bplrLogWidget(groups, data, item, i + 1);
        }
      })
      .catch(error => console.log("Couldn't download the widget data from " + item.url, error));
  });
}

// Widgets on the page, in page order: { div, type, widgetId (standard lightbox only) }.
function bplrFindWidgets() {
  let markers = document.querySelectorAll('[class*="-lightbox-widget-wrapper"], .bplr-shorts-container, .bplr-td-holder, .tv-reel-cards');

  return [...markers].map(el => {
    let type = "Reels";
    let widgetId = null;

    if (el.matches('[class*="-lightbox-widget-wrapper"]')) {
      type = "Lightbox";
      widgetId = (String(el.className).match(/widget-(\d+)-lightbox/) || [])[1] || null;
    } else if (el.matches(".bplr-shorts-container")) {
      type = "Vertical lightbox";
    } else if (el.matches(".bplr-td-holder")) {
      type = "OTT traffic driver";
    }

    return { div: el.closest("div[id^=TargetVideo_], div[id^=Brid_]") || el, type: type, widgetId: widgetId, used: false };
  });
}

// Same group names and order as the player info table, plus a Widget group first.
function bplrWidgetGroups(data, item) {
  let partner = data.Partner || {};
  let player = data.Player || {};
  let playlist = data.Playlist || {};
  let videos = data.Video || [];

  return [
    ["Widget", [
      ["Widget type:", item.widget ? item.widget.type : "/"],
      ["Widget ID:", item.widgetId]
    ]],
    ["Account", [
      ["Partner domain:", partner.domain_short || "/"],
      ["Partner ID:", partner.id || "/"],
      ["User ID:", partner.user_id || "/"]
    ]],
    ["Player", [
      ["Player ID:", player.id || "/"],
      ["Player size:", player.width && player.height ? `${player.width} x ${player.height}` : "/"]
    ]],
    ["Content", [
      ["Playlist ID:", playlist.id || "/"],
      ["Playlist name:", playlist.name || "/"]
    ]],
    ["Ads", [
      ["Monetize:", player.monetize],
      ["Ad schedule ID:", player.ad_schedule_id || "/"]
    ]],
    // Long values last. Two rows also give the vertical group name enough height.
    ["Details", [
      ["Video IDs:", videos.map(video => video.id)],
      ["JSON:", item.url]
    ]]
  ];
}

function bplrLogWidget(groups, data, item, number) {
  let type = item.widget ? item.widget.type : "Widget";
  console.group(`%cWidget ${number}: ${type} ${item.widgetId}`, `${bplrWidgetAccent}font-size:14px;`);
  console.log(type === "Lightbox" || type === "Vertical lightbox"
    ? "Widget data only. Open a video in the widget for full player info."
    : "This widget has no player on the page, so only widget data is shown.");

  groups.forEach(([name, rows]) => {
    console.group(`%c${name}`, bplrWidgetAccent);
    rows.forEach(([label, value]) => {
      if (Array.isArray(value)) {
        value = value.length ? value.join(", ") : "/";
      }
      console.log(`${label} %c${value}`, "font-weight: bold;");
    });
    console.groupEnd();
  });

  console.groupCollapsed("Full widget data");
  console.log(data);
  console.groupEnd();

  console.groupEnd();
}

// Same look as the player info table (css/info-table.css).
function bplrInsertWidgetTable(groups, item) {
  if (!item.widget) {
    console.log("Couldn't find the widget on the page for " + item.url + ". Use \"Log to console\" instead.");
    return;
  }

  let div = item.widget.div;
  let width = div.clientWidth;
  let table = document.createElement("table");
  table.className = "infoTable";
  table.dataset.bplrWidget = item.widgetId;
  // Inline !important, so the site's CSS can't override the width.
  table.style.setProperty("width", `${width}px`, "important");

  groups.forEach(([name, rows]) => {
    // A thick line under the previous group's last row.
    table.lastElementChild?.classList.add("infoTableGroupEnd");

    let groupCell = document.createElement("td");
    groupCell.className = "infoTableGroup";
    groupCell.rowSpan = rows.length;
    groupCell.appendChild(Object.assign(document.createElement("div"), { innerText: name }));

    rows.forEach(([label, value], i) => {
      let tr = document.createElement("tr");
      if (i === 0) tr.appendChild(groupCell);

      tr.appendChild(Object.assign(document.createElement("td"), { innerText: label, width: `${width / 4}` }));

      let td = document.createElement("td");
      if (label === "JSON:") {
        td.appendChild(Object.assign(document.createElement("a"), { href: value, target: "_blank", innerText: value }));
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          td.innerText = "/";
        } else {
          value.forEach(v => td.appendChild(Object.assign(document.createElement("span"), { innerText: v })));
        }
      } else {
        td.innerText = String(value);
      }
      tr.appendChild(td);

      table.appendChild(tr);
    });
  });

  div.parentElement.insertBefore(table, div);
  div.parentElement.insertBefore(document.createElement("br"), div);
}
