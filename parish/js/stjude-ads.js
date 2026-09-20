/**
 * St. Jude 300x250 rotating creatives for parish detail pages.
 * Link: http://fundraising.stjude.org/goto/ReadyCatholic
 */
(function () {
  var img = document.getElementById("stjude-ad-img");
  if (!img) return;
  var base = "";
  try {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.indexOf("stjude-ads.js") !== -1) {
        base = scripts[i].src.replace(/js\/stjude-ads\.js.*$/, "ads/");
        break;
      }
    }
  } catch (e) {}
  if (!base) base = "../../ads/";
  var files = ["stjude-1.jpg", "stjude-2.jpg", "stjude-3.jpg"];
  img.src = base + files[Math.floor(Math.random() * files.length)];
})();
