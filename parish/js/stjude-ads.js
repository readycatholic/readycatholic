/**
 * St. Jude 300x250 HQ rotating creatives.
 * Link: http://fundraising.stjude.org/goto/ReadyCatholic
 * Images live at repo root: stjude-1.jpg, stjude-2.jpg, stjude-3.jpg
 */
(function () {
  var img = document.getElementById("stjude-ad-img");
  if (!img) return;
  var base = "";
  try {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.indexOf("stjude-ads.js") !== -1) {
        // parish/js/stjude-ads.js -> site root
        base = scripts[i].src.replace(/parish\/js\/stjude-ads\.js.*$/, "");
        break;
      }
    }
  } catch (e) {}
  if (!base) base = "../../../";
  var files = ["stjude-1.jpg", "stjude-2.jpg", "stjude-3.jpg"];
  img.src = base + files[Math.floor(Math.random() * files.length)];
})();
