if (typeof BPLR === "undefined" && typeof Brid === "undefined") {
    console.log("No TargetVideo player found on this page. If the player is in an iframe, this debug script can't read its data.");
} else {
    if (typeof playerDivs === "undefined" || document.querySelector('table.infoTable') === null) {
        playerDivs = [];

        if ($bp().config.mode === "widget") {
            playerDivs = document.querySelectorAll('div[class$=-playlist-widget], div[class$=-mid-article-widget], div[class$=-native-widget], div[class$=-simple-widget-wrapper-main]');
        }

        // Not a widget, or a lightbox widget (not in the list above), whose player only exists once a video is opened.
        if (playerDivs.length === 0) {
            playerDivs = document.querySelectorAll('div[id^=TargetVideo_].bplr, div[id^=Brid_].bplr, div[id^=TargetVideo_].brid, div[id^=Brid_].brid, div[id^=Step-network_].bplr, div[id^=Step-network_].brid, div#BPLR_Single_Embed.bplr, div#Brid_Single_Embed.brid, div[id^=Player_].bplr, div[id^=bplr-shorts-player-].bplr, div[id^=bplr_].bplr');
        }

        playerDivs.forEach(playerDiv => {
            let anchor = getTableAnchor(playerDiv);

            anchor.parentElement.insertBefore(createTable(playerDiv, anchor.clientWidth), anchor);
            anchor.parentElement.insertBefore(document.createElement('br'), anchor);
        });
    } else {
        console.log("Script already run! Exiting gracefully.");
    }
}

// Where the table goes. Lightbox players play in an overlay, so their table goes above the widget on the page instead.
function getTableAnchor(playerDiv) {
    let widget = null;

    if (playerDiv.id.startsWith("bplr-shorts-player-")) {
        // Vertical lightbox: the player ID ends with the widget div's ID (bplr-shorts-player-TargetVideo_123).
        widget = document.getElementById(playerDiv.id.replace("bplr-shorts-player-", ""));
    } else if (playerDiv.id.startsWith("Player_")) {
        // Standard lightbox: Player_<widget ID>, and the widget's own elements use widget-<widget ID>-lightbox-* classes.
        widget = document.querySelector(`[class^="widget-${playerDiv.id.slice("Player_".length)}-lightbox"]`)?.closest("div[id^=TargetVideo_], div[id^=Brid_]");
    }

    return widget || playerDiv;
}

function createTable(playerDivs, tableWidth) {
    let table = Object.assign(document.createElement('table'), {
        className: "infoTable"
    });
    // Inline !important, so the site's CSS can't override the width. (The HTML width attribute can't take !important.)
    table.style.setProperty("width", `${tableWidth}px`, "important");

    let group = null;

    // Starts a new group: a narrow side cell with the group name, spanning all of its rows.
    function startGroup(name) {
        table.lastElementChild?.classList.add("infoTableGroupEnd");

        group = {
            cell: Object.assign(document.createElement('td'), { className: "infoTableGroup" }),
            rows: 0
        };
        group.cell.appendChild(Object.assign(document.createElement('div'), {
            innerText: name
        }));
    }

    function createRow(cell1, cell2) {
        let td = document.createElement('td');
        let tr = document.createElement('tr');

        if (group) {
            if (group.rows === 0) tr.appendChild(group.cell);
            group.cell.rowSpan = ++group.rows;
        }

        tr.appendChild(Object.assign(document.createElement('td'), {
            innerText: cell1,
            width: `${tableWidth/4}`
        }));
        
        switch (cell1) {
            case "JSON:":
                td.appendChild(Object.assign(document.createElement('a'), {
                    href: cell2,
                    target: "_blank",
                    innerText: cell2
                }));
                
                tr.appendChild(td);
                break;
            case "Renditions:":
            case "Plugins:":
            case "Ad types:":
            case "Waits for consent:":
                if (cell2 === "/" || cell2.length === 0) {
                    tr.appendChild(Object.assign(document.createElement('td'), {
                        innerText: "/"
                    }));
                } else {
                    cell2.forEach(item => {
                        td.appendChild(Object.assign(document.createElement('span'), {
                            innerText: item
                        }));
                    });
                    
                    tr.appendChild(td);
                }
                break;
            case "Tags:":
                if (cell2 === "/") {
                    tr.appendChild(Object.assign(document.createElement('td'), {
                        innerText: cell2
                    }));
                } else {
                    let tags = cell2.split(",");
                    
                    tags.forEach(tag => {
                        td.appendChild(Object.assign(document.createElement('span'), {
                            innerText: tag
                        }));
                    });
                    
                    tr.appendChild(td);
                }
                break;
            case "IAB categories:":
                if (cell2 === "/") {
                    tr.appendChild(Object.assign(document.createElement('td'), {
                        innerText: cell2
                    }));
                } else {
                    let categories = cell2.split(",");
                    
                    for (let i = 0; i < categories.length; i++) {
                        if (i % 2 === 0) {
                            td.appendChild(Object.assign(document.createElement('span'), {
                                innerText: `${categories[i]}, ${categories[i+1]}`
                            }));
                        }
                    }
                    
                    tr.appendChild(td);
                }
                break;
            default:
                tr.appendChild(Object.assign(document.createElement('td'), {
                    innerText: cell2
                }));
                break;
        }
        
        table.appendChild(tr);
    }
    
    startGroup("Account");
    createRow(`Partner domain:`, $bp(playerDivs.id).config.Partner.domain_short);
    createRow(`Partner ID:`, $bp(playerDivs.id).config.partner_id);
    createRow(`User ID:`, $bp(playerDivs.id).config.Partner.user_id);

    startGroup("Player");
    createRow(`Player ID:`, $bp(playerDivs.id).config.id);
    createRow(`Player template ID:`, $bp(playerDivs.id).config.player_template_id);
    createRow(`Div ID:`, $bp(playerDivs.id).id);
    createRow(`Mode:`, $bp(playerDivs.id).config.mode);
    createRow(`Player size:`, `${$bp(playerDivs.id).config.width} x ${$bp(playerDivs.id).config.height}`);
    createRow(`Start volume:`, `${$bp(playerDivs.id).config.start_volume}%`);
    createRow(`Plugins:`, ($bp(playerDivs.id).config.Plugin || []).map(plugin => plugin?.id ?? plugin));

    startGroup("Content");
    if ($bp(playerDivs.id).config.mode === "widget") {
        createRow(`Widget ID:`, $bp(playerDivs.id).config.playlist?.id || "/");
    }
    // In widget mode config.playlist is an object holding the widget ID, not the playlist ID, so skip it.
    createRow(`Playlist ID:`, $bp(playerDivs.id).config.Playlist?.id || (typeof $bp(playerDivs.id).config.playlist === "object" ? "" : $bp(playerDivs.id).config.playlist) || "/");
    createRow(`Video ID:`, $bp(playerDivs.id).currentSource.id);
    createRow(`Video origin:`, $bp(playerDivs.id).currentSource.origin_video || "/");
    createRow(`Mime type:`, $bp(playerDivs.id).currentSource.mimeType);
    createRow(`Renditions:`, Object.keys($bp(playerDivs.id).currentSource.source || {}) || "/");

    startGroup("Ads");
    createRow(`Monetize:`, $bp(playerDivs.id).config.monetize);
    createRow(`Ad SDK:`, $bp(playerDivs.id).config.adSDK || "/");
    createRow(`Ad schedule ID:`, $bp(playerDivs.id).config.ad_schedule_id || "/");
    createRow(`Ad schedule ID (Video):`, $bp(playerDivs.id).currentSource.ad_schedule_id || "/");
    createRow(`Ad types:`, [
        ["Pre-roll", $bp(playerDivs.id).hasPreroll],
        ["Mid-roll", $bp(playerDivs.id).hasMidroll],
        ["Post-roll", $bp(playerDivs.id).hasPostroll],
        ["Overlay", $bp(playerDivs.id).hasOverlay],
        ["Banner", $bp(playerDivs.id).hasBanner]
    ].filter(([, on]) => on).map(([name]) => name));
    createRow(`Waits for consent:`, [
        ["TCF", $bp(playerDivs.id).config.wait_tcf_api],
        ["GPP", $bp(playerDivs.id).config.wait_gpp_api]
    ].filter(([, on]) => on).map(([name]) => name));

    // Long values last, so they don't push the short rows down
    startGroup("Details");
    createRow(`Tags:`, $bp(playerDivs.id).currentSource.tags || "/");
    createRow(`IAB categories:`, $bp(playerDivs.id).currentSource.iab_categories || "/");
    createRow(`JSON:`, getJsonUrl(playerDivs));
    
    return table;
}

function getJsonUrl (playerDivs) {
    let urlEnv = `${$bp(playerDivs.id).assets.URLconfig.service}/${$bp(playerDivs.id).assets.URLconfig.dynamic}`;
    let urlConfig = `${$bp(playerDivs.id).config.mode}/${$bp(playerDivs.id).config.id}`;
    
    switch ($bp(playerDivs.id).config.mode) {
        case "video":
            return `${urlEnv}${urlConfig}/${$bp(playerDivs.id).currentSource.id}.json`
        case "playlist":
            return `${urlEnv}${urlConfig}/${$bp(playerDivs.id).config.Playlist?.id || $bp(playerDivs.id).config.playlist}.json`
        case "latest":
            return `${urlEnv}${urlConfig}/0/1/25/0.json`
        case "widget":
            // Vertical lightbox players have no widget ID (config.playlist holds the videos instead).
            if (!$bp(playerDivs.id).config.playlist?.id) return "Not able to get JSON url."
            return `${urlEnv}${urlConfig}/${$bp(playerDivs.id).config.playlist.id}/1/25.json`
        case "config":
            return `${urlEnv}video/${$bp(playerDivs.id).config.id}/${$bp(playerDivs.id).currentSource.id}.json`
        case "matched_videos":
            return `${$bp(playerDivs.id).assets.URLconfig.service}/fetch_matching_config/${$bp(playerDivs.id).config.id}/${$bp(playerDivs.id).config.partner_id}.json`
        default:
            return "Not able to get JSON url."
    }
}