/**
 * St. Jude 300x250 HQ rotating creatives.
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
  var picks = [
    ["s1a.txt","s1b.txt","s1c.txt"],
    ["s2a.txt","s2b.txt","s2c.txt"],
    ["s3a.txt","s3b.txt","s3c.txt"]
  ];
  var pick = picks[Math.floor(Math.random() * picks.length)];
  Promise.all(pick.map(function (f) {
    return fetch(base + f).then(function (r) {
      if (!r.ok) throw new Error(f + " " + r.status);
      return r.text();
    });
  })).then(function (parts) {
    var b64 = parts.join("").replace(/\s+/g, "");
    while (b64.length % 4) b64 += "=";
    img.src = "data:image/jpeg;base64," + b64;
  }).catch(function (err) {
    console.warn("St. Jude ad load failed", err);
  });
})();
