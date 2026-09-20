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
  var files = ["stjude-1.b64.txt", "stjude-2.b64.txt", "stjude-3.b64.txt"];
  var pick = files[Math.floor(Math.random() * files.length)];
  fetch(base + pick)
    .then(function (r) { return r.text(); })
    .then(function (b64) {
      img.src = "data:image/jpeg;base64," + b64.trim();
    })
    .catch(function () {});
})();
