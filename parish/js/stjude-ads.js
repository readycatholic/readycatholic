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
        base = scripts[i].src.replace(/stjude-ads\.js.*$/, "");
        break;
      }
    }
  } catch (e) {}
  if (!base) base = "../../js/";
  var files = ["stjude-ad-1.js", "stjude-ad-2.js", "stjude-ad-3.js"];
  var loaded = 0;
  files.forEach(function (f) {
    var s = document.createElement("script");
    s.src = base + f;
    s.onload = function () {
      loaded++;
      if (loaded === files.length && window.__STJUDE_ADS && window.__STJUDE_ADS.length) {
        var i = Math.floor(Math.random() * window.__STJUDE_ADS.length);
        img.src = window.__STJUDE_ADS[i];
      }
    };
    document.head.appendChild(s);
  });
})();
