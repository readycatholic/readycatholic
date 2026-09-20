/**
 * St. Jude 300x250 rotating creatives (high quality, split parts).
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
  var picks = [["stjude-1a.txt","stjude-1b.txt"],["stjude-2a.txt","stjude-2b.txt"],["stjude-3a.txt","stjude-3b.txt"]];
  var pick = picks[Math.floor(Math.random() * picks.length)];
  Promise.all(pick.map(function (f) { return fetch(base + f).then(function (r) { return r.text(); }); }))
    .then(function (parts) {
      var b64 = (parts[0] + parts[1]).replace(/\s+/g, "");
      while (b64.length % 4) b64 += "=";
      img.src = "data:image/jpeg;base64," + b64;
    })
    .catch(function (err) { console.warn("St. Jude ad load failed", err); });
})();
