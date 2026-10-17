/* Ready Catholic privacy-friendly analytics beacon (no cookies). Inert until ENDPOINT is set. */
(function () {
  var ENDPOINT = "https://readycatholic-stats.jamescoogan.workers.dev/hit";
  if (!ENDPOINT) return;
  function send(o) {
    try {
      o.p = location.pathname;
      var b = JSON.stringify(o);
      if (navigator.sendBeacon) navigator.sendBeacon(ENDPOINT, new Blob([b], { type: "text/plain" }));
      else fetch(ENDPOINT, { method: "POST", body: b, keepalive: true });
    } catch (e) {}
  }
  var u = (new URLSearchParams(location.search)).get("utm_source") || "";
  send({ k: "view", r: document.referrer, u: u });
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a[href]");
    if (!a) return;
    var h;
    try { h = new URL(a.href); } catch (e) { return; }
    if (h.hostname === location.hostname) return;
    var ad = /foresters/i.test(a.getAttribute("aria-label") || "");
    send({ k: "click", t: ad ? "foresters-ad" : h.hostname.replace(/^www\./, ""), l: (a.textContent || "").trim() });
  }, true);
})();
