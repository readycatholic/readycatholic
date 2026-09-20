/**
 * St. Jude 300x250 rotating creatives
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
  var manifest = {1: 8, 2: 8, 3: 9};
  var pending = 0;
  var ids = [1, 2, 3];
  function assemble() {
    var ads = [];
    ids.forEach(function (n) {
      var parts = window["__SJ" + n];
      if (parts && parts.length) ads.push("data:image/jpeg;base64," + parts.join(""));
    });
    if (!ads.length) return;
    img.src = ads[Math.floor(Math.random() * ads.length)];
  }
  ids.forEach(function (n) {
    for (var p = 0; p < manifest[n]; p++) {
      pending++;
      (function (n, p) {
        var s = document.createElement("script");
        s.src = base + "sj" + n + "_" + p + ".js";
        s.onload = s.onerror = function () { pending--; if (pending <= 0) assemble(); };
        document.head.appendChild(s);
      })(n, p);
    }
  });
})();
