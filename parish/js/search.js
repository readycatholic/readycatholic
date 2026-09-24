/**
 * Ready Catholic — Find your local parish (ZIP lookup)
 * Exact ZIP match, else nearest by haversine distance.
 */
(function () {
  "use strict";

  var parishes = [];
  var zipCoords = {};
  var dataReady = false;
  var pendingSearch = null;

  var form = document.getElementById("zip-form");
  var input = document.getElementById("zip-input");
  var results = document.getElementById("results");
  if (!form || !input || !results) return;

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

  function renderParish(p, miles) {
    var html = '<div class="parish-card">';
    html += "<h3>" + (p.name || "Parish") + "</h3>";
    if (p.address) html += "<p class=\"addr\">" + p.address + "</p>";
    html += "<p class=\"city\">" + (p.city || "") + (p.state ? ", " + p.state : "") + " " + (p.zip || "") + "</p>";
    if (p.phone) html += "<p class=\"phone\"><a href=\"tel:" + p.phone.replace(/[^\d+]/g, "") + "\">" + p.phone + "</a></p>";
    if (p.website)
      html +=
        '<p class="web"><a href="' +
        p.website +
        '" target="_blank" rel="noopener">Website</a></p>';
    if (miles != null) html += '<p class="dist">' + miles.toFixed(1) + " miles away</p>";
    if (p.slug)
      html +=
        '<p class="more"><a href="parishes/' +
        p.slug +
        '.html">Parish page</a></p>';
    html += "</div>";
    return html;
  }

  function doSearch(zip) {
    zip = (zip || "").trim();
    if (!/^\d{5}$/.test(zip)) {
      results.innerHTML = '<p class="empty">Enter a valid 5-digit ZIP code.</p>';
      return;
    }
    if (!dataReady) {
      pendingSearch = zip;
      results.innerHTML = '<p class="empty">Loading parish data…</p>';
      return;
    }

    var exact = parishes.filter(function (p) {
      return p.zip === zip;
    });
    if (exact.length) {
      results.innerHTML =
        '<p class="label">Parishes in ' +
        zip +
        "</p>" +
        exact.map(function (p) {
          return renderParish(p, null);
        }).join("");
      return;
    }

    results.innerHTML = '<p class="empty">Looking up nearest parishes…</p>';
    lookupZipCoords(zip)
      .then(function (c) {
        var nearest = findNearest(c.lat, c.lng, 5);
        if (!nearest.length) {
          results.innerHTML =
            '<p class="empty">No parish coordinates available yet for nearby search. Try another ZIP or check back soon.</p>';
          return;
        }
        results.innerHTML =
          '<p class="label">No parish in ' +
          zip +
          ". Nearest:</p>" +
          nearest
            .map(function (x) {
              return renderParish(x.parish, x.miles);
            })
            .join("");
      })
      .catch(function () {
        results.innerHTML =
          '<p class="empty">Could not look up that ZIP location. Please try another ZIP.</p>';
      });
  }

  Promise.all([
    fetch("data/parishes.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-c.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-d.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-albany.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-albany-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-brooklyn.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-brooklyn-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-brooklyn-c.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-buffalo.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-buffalo-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-buffalo-c.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-ogdensburg.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-ogdensburg-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-ogdensburg-c.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-rochester.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-rochester-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-rochester-c.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-rockville.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-rockville-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-rockville-c.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-syracuse.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-syracuse-b.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
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
    fetch("data/zip_coords.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-b.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-c.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-d.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-e.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-f.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-g.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-h.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch("data/zip_coords-i.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ]).then(function (parts) {
    var parishParts = parts.slice(0, -9);
    zipCoords = {};
    parts.slice(-9).forEach(function (obj) {
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
      console.log("[ReadyCatholic] Loaded " + parishes.length + " parishes (" + withZip + " with ZIP), " + Object.keys(zipCoords).length + " ZIP coords");
      if (pendingSearch) {
        var run = pendingSearch;
        pendingSearch = null;
        doSearch(run);
      }
    }

    if (!needList.length) {
      finishReady();
      return;
    }

    var batchSize = 25;
    var i = 0;
    function nextBatch() {
      var batch = needList.slice(i, i + batchSize);
      i += batchSize;
      if (!batch.length) {
        finishReady();
        return;
      }
      Promise.all(
        batch.map(function (z) {
          return fetch("https://api.zippopotam.us/us/" + z)
            .then(function (r) {
              return r.ok ? r.json() : null;
            })
            .then(function (data) {
              if (data && data.places && data.places[0]) {
                zipCoords[z] = {
                  lat: parseFloat(data.places[0].latitude),
                  lng: parseFloat(data.places[0].longitude),
                };
              }
            })
            .catch(function () {});
        })
      ).then(nextBatch);
    }
    nextBatch();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    doSearch(input.value);
  });
})();
