/**
 * Ready Catholic — Find your local parish (ZIP lookup)
 * Exact ZIP match, or nearest parishes by miles when none match.
 * Pretty URLs: /parish/{zip}/{slug}/ from full parish name
 * Font: Verdana
 */
(function () {
  const form = document.getElementById("parish-search-form");
  const input = document.getElementById("zip-input");
  const results = document.getElementById("parish-results");
  const status = document.getElementById("parish-status");

  if (!form || !input || !results) return;

  let parishes = [];
  let zipCoords = {};
  let dataReady = false;
  let pendingSearch = null;

  function setStatus(msg) {
    if (status) status.textContent = msg || "";
  }

  function normalizeZip(z) {
    return String(z || "").replace(/\D/g, "").slice(0, 5);
  }

  function parishSlug(p) {
    // Original preferred format: parish-name-city-state
    var name = (p.name || "parish");
    var city = p.city || "";
    var state = p.state || "";
    var parts = [name];
    if (city) parts.push(city);
    if (state) parts.push(state);
    return parts
      .join(" ")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
  }

  function parishUrl(p) {
    var slug = parishSlug(p);
    if (p.zip && slug) {
      return p.zip + "/" + slug + "/";
    }
    return "detail.html?slug=" + encodeURIComponent(slug || "");
  }

  function haversine(lat1, lng1, lat2, lng2) {
    var R = 3958.8;
    var toRad = Math.PI / 180;
    var dLat = (lat2 - lat1) * toRad;
    var dLng = (lng2 - lng1) * toRad;
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function parishCoords(p) {
    if (p.lat != null && p.lng != null) {
      var la = parseFloat(p.lat);
      var ln = parseFloat(p.lng);
      if (!isNaN(la) && !isNaN(ln)) return { lat: la, lng: ln };
    }
    if (p.zip && zipCoords[p.zip]) {
      return zipCoords[p.zip];
    }
    return null;
  }

  function findNearest(searchLat, searchLng, limit) {
    var scored = [];
    for (var i = 0; i < parishes.length; i++) {
      var p = parishes[i];
      var c = parishCoords(p);
      if (!c) continue;
      var d = haversine(searchLat, searchLng, c.lat, c.lng);
      scored.push({ parish: p, miles: d });
    }
    scored.sort(function (a, b) {
      return a.miles - b.miles;
    });
    return scored.slice(0, limit || 5);
  }

  function lookupZipCoords(zip) {
    if (zipCoords[zip]) {
      return Promise.resolve(zipCoords[zip]);
    }
    return fetch("https://api.zippopotam.us/us/" + zip)
      .then(function (r) {
        if (!r.ok) throw new Error("ZIP not found");
        return r.json();
      })
      .then(function (data) {
        if (!data.places || !data.places[0]) throw new Error("No place data");
        var c = {
          lat: parseFloat(data.places[0].latitude),
          lng: parseFloat(data.places[0].longitude),
        };
        zipCoords[zip] = c;
        return c;
      });
  }

  function renderList(list, opts) {
    results.innerHTML = "";
    if (opts && opts.headerHtml) {
      var hdr = document.createElement("div");
      hdr.className = "empty";
      hdr.innerHTML = opts.headerHtml;
      results.appendChild(hdr);
    }
    if (!list.length) {
      if (!(opts && opts.headerHtml)) {
        results.innerHTML = '<p class="empty">No parishes found.</p>';
      }
      return;
    }
    var ul = document.createElement("ul");
    ul.className = "parish-list";
    list.forEach(function (item) {
      var p = item.parish || item;
      var miles = item.miles;
      var li = document.createElement("li");
      li.className = "parish-card";
      var title = document.createElement("h3");
      var link = document.createElement("a");
      link.href = parishUrl(p);
      link.textContent = p.name;
      title.appendChild(link);
      li.appendChild(title);
      if (p.address) {
        var addr = document.createElement("p");
        addr.className = "addr";
        addr.textContent = p.address;
        li.appendChild(addr);
      }
      var city = document.createElement("p");
      city.className = "meta";
      city.textContent =
        (p.city || "") +
        (p.state ? ", " + p.state : "") +
        (p.zip ? " " + p.zip : "");
      li.appendChild(city);
      if (p.phone) {
        var ph = document.createElement("p");
        ph.className = "phone";
        var pha = document.createElement("a");
        pha.href = "tel:" + String(p.phone).replace(/[^\d+]/g, "");
        pha.textContent = p.phone;
        ph.appendChild(pha);
        li.appendChild(ph);
      }
      if (p.website) {
        var web = document.createElement("p");
        var weba = document.createElement("a");
        weba.href = p.website;
        weba.target = "_blank";
        weba.rel = "noopener";
        weba.textContent = "Website";
        web.appendChild(weba);
        li.appendChild(web);
      }
      if (miles != null) {
        var dist = document.createElement("p");
        dist.className = "meta";
        dist.textContent = miles.toFixed(1) + " miles away";
        li.appendChild(dist);
      }
      ul.appendChild(li);
    });
    results.appendChild(ul);
  }

  function doSearch(zip) {
    zip = normalizeZip(zip);
    if (!/^\d{5}$/.test(zip)) {
      results.innerHTML = '<p class="empty">Enter a valid 5-digit ZIP code.</p>';
      return;
    }
    if (!dataReady) {
      pendingSearch = zip;
      setStatus("Loading parish data…");
      return;
    }

    var exact = parishes.filter(function (p) {
      return p.zip === zip;
    });
    if (exact.length) {
      setStatus("");
      renderList(
        exact.map(function (p) {
          return { parish: p };
        }),
        { headerHtml: "<strong>Parishes in " + zip + "</strong>" }
      );
      return;
    }

    setStatus("Looking up nearest parishes…");
    lookupZipCoords(zip)
      .then(function (c) {
        var nearest = findNearest(c.lat, c.lng, 5);
        setStatus("");
        if (!nearest.length) {
          results.innerHTML =
            '<p class="empty">No parish coordinates available yet for nearby search. Try another ZIP or check back soon.</p>';
          return;
        }
        renderList(nearest, {
          headerHtml:
            "No parish in <strong>" +
            zip +
            "</strong>. Nearest:",
        });
      })
      .catch(function () {
        setStatus("");
        results.innerHTML =
          '<p class="empty">Could not look up that ZIP location. Please try another ZIP.</p>';
      });
  }

  setStatus("Loading parish data…");

  Promise.all([
    fetch("data/parishes.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-orlando.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-pb-extra.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-miami.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-miami-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-venice.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-venice-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-stpete.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-stpete-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-staug.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-staug-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-pt.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-pt-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-archny.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-archny-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-archny-c.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-archny-d.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-archny-e.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-archny-f.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-archny-g.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-archny-h.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-archny-i.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-archny-j.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-archny-k.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-albany.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-albany-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-albany-c.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-brooklyn.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-brooklyn-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-brooklyn-c.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-brooklyn-d.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-buffalo.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-buffalo-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-buffalo-c.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-ogdensburg.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-ogdensburg-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-ogdensburg-c.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-rochester.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-rochester-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-rochester-c.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-rvc.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-rvc-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-rvc-c.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-rvc-d.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-syr.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-syr-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-syr-c.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-syr-d.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-chicago.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-chicago-a2.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-chicago-a3.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-chicago-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-chicago-b2.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-chicago-b3.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-chicago-b4.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-chicago-b5.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-chicago-b6.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-chicago-b7.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-chicago-b8.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-chicago-b9.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-chicago-b10.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-belleville.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-belleville-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-belleville-c.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-belleville-d.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-belleville-e.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-joliet.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-joliet-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-joliet-c.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-joliet-d.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-joliet-e.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/zip_coords.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-b.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-c.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-d.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-e.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-f.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-g.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-h.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-i.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-j.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ]).then(function (parts) {
    var parishParts = parts.slice(0, -10);
    zipCoords = {};
    parts.slice(-10).forEach(function (obj) {
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        Object.keys(obj).forEach(function (z) { zipCoords[z] = obj[z]; });
      }
    });

    var seen = {};
    parishes = [];
    parishParts.forEach(function (arr) {
      if (!Array.isArray(arr)) return;
      arr.forEach(function (p) {
        var k = (p.zip || "") + "|" + (p.slug || p.id || "");
        if (seen[k]) return;
        seen[k] = true;
        parishes.push(p);
      });
    });

    var need = {};
    parishes.forEach(function (p) {
      if (p.zip && !zipCoords[p.zip]) {
        var lat = parseFloat(p.lat);
        var lng = parseFloat(p.lng);
        if (isNaN(lat) || isNaN(lng)) need[p.zip] = true;
      }
    });
    var needList = Object.keys(need);

    function finishReady() {
      dataReady = true;
      var withZip = parishes.filter(function (p) { return p.zip; }).length;
      setStatus("Loaded " + parishes.length + " parishes (" + withZip + " with ZIP).");
      var run = pendingSearch;
      pendingSearch = null;
      var params = new URLSearchParams(window.location.search);
      var qZip = params.get("zip");
      if (run) {
        doSearch(run);
      } else if (qZip) {
        input.value = normalizeZip(qZip);
        doSearch(qZip);
      }
    }

    finishReady();
    if (!needList.length) return;

    var i = 0;
    function nextBatch() {
      var batch = needList.slice(i, i + 25);
      i += 25;
      if (!batch.length) return;
      Promise.all(batch.map(function (z) {
        return fetch("https://api.zippopotam.us/us/" + z)
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (!data || !data.places || !data.places[0]) return;
            zipCoords[z] = {
              lat: parseFloat(data.places[0].latitude),
              lng: parseFloat(data.places[0].longitude)
            };
          })
          .catch(function () {});
      })).then(nextBatch);
    }
    nextBatch();
  }).catch(function () {
    setStatus("Could not load parish data.");
    dataReady = true;
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    doSearch(input.value);
  });
})();
