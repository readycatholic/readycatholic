/**
 * St. Jude 300x250 rotating creatives for parish detail pages.
 * Link: http://fundraising.stjude.org/goto/ReadyCatholic
 */
(function () {
  var ads = [];
  // populated below
  var img = document.getElementById("stjude-ad-img");
  if (!img) return;
  // Load creatives from separate files to keep this loader small
  var files = ["stjude-ad-1.js", "stjude-ad-2.js", "stjude-ad-3.js"];
  var loaded = 0;
  files.forEach(function (f, idx) {
    var s = document.createElement("script");
    s.src = (document.currentScript && document.currentScript.src.replace(/stjude-ads\.js.*/, "") || "../../js/") + f;
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
