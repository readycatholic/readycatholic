/**
 * St. Jude 300x250 rotating creatives for parish detail pages.
 * Link: http://fundraising.stjude.org/goto/ReadyCatholic
 */
(function () {
  var img = document.getElementById("stjude-ad-img");
  if (!img) return;

  function pick() {
    if (!window.__STJUDE_ADS || !window.__STJUDE_ADS.length) return;
    var i = Math.floor(Math.random() * window.__STJUDE_ADS.length);
    img.src = window.__STJUDE_ADS[i];
  }

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
  var pending = files.length;
  function done() {
    pending--;
    if (pending <= 0) pick();
  }
  files.forEach(function (f) {
    var s = document.createElement("script");
    s.src = base + f;
    s.onload = done;
    s.onerror = done;
    document.head.appendChild(s);
  });
})();
