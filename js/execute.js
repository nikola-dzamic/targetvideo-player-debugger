// Temporary notification messages in the popup.
const bplrNotice = document.getElementById("bplrNotice");
let bplrNoticeTimer = null;

function showNotice(text) {
  bplrNotice.textContent = text;
  clearTimeout(bplrNoticeTimer);
  bplrNoticeTimer = setTimeout(function () {
    bplrNotice.textContent = "";
  }, 3000);
}
