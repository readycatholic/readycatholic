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

  function setStatus(msg) {
    if (status) status.textContent = msg;
  }

  function formatPhone(raw) {
    if (!raw) return "";
    var digits = String(raw).replace(/\D/g, "");
    if (digits.length === 11 && digits.charAt(0) === "1") {
      digits = digits.slice(1);
    }
    if (digits.length === 10) {
      return "(" + digits.slice(0, 3) + ") " + digits.slice(3, 6) + "-" + digits.slice(6);
    }
    return String(raw).trim();
  }

  function haversineMiles(lat1, lng1, lat2, lng2) {
    var R = 3958.8;
    var toRad = function (d) { return (d * Math.PI) / 180; };
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function normalizeZip(raw) {
    return String(raw || "").replace(/\D/g, "").slice(0, 5);
  }

  function slugify(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function parishSlug(p) {
    var name = (p.name || "").trim();
    var city = (p.city || "").trim();
    var state = (p.state || "").trim();
    var parts = [];
    if (name) parts.push(name);
    if (city) parts.push(city);
    if (state) parts.push(state);
    var slug = slugify(parts.join(" "));
    if (!slug) slug = slugify(p.slug || p.id || "parish");
    return slug;
  }

  function parishUrl(p) {
    var slug = parishSlug(p);
    if (p.zip && slug) {
      return p.zip + "/" + slug + "/";
    }
    return "detail.html?slug=" + encodeURIComponent(slug || "");
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
        results.innerHTML = "<p class=\"empty\">No parishes found.</p>";
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
      if (typeof miles === "number") {
        var dist = document.createElement("p");
        dist.className = "meta";
        dist.textContent =
          (miles < 10 ? miles.toFixed(1) : Math.round(miles)) + " miles away";
        li.appendChild(dist);
      }
      var addr = document.createElement("p");
      addr.className = "addr";
      if (p.address) {
        addr.textContent = p.address + ", " + p.city + ", " + p.state + " " + (p.zip || "");
      } else {
        addr.textContent = p.city + ", " + p.state + (p.zip ? " " + p.zip : "");
      }
      li.appendChild(addr);
      var meta = document.createElement("p");
      meta.className = "meta";
      meta.textContent = p.diocese || "";
      li.appendChild(meta);
      if (p.phone) {
        var phone = document.createElement("p");
        phone.className = "phone";
        phone.textContent = formatPhone(p.phone);
      li.appendChild(phone);
      }
      var more = document.createElement("a");
      more.href = parishUrl(p);
      more.textContent = "Parish page →";
      li.appendChild(more);
      ul.appendChild(li);
    });
    results.appendChild(ul);
  }

  function parishCoords(p) {
    var lat = parseFloat(p.lat);
    var lng = parseFloat(p.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat: lat, lng: lng };
    }
    if (p.zip && zipCoords[p.zip]) {
      return zipCoords[p.zip];
    }
    return null;
  }

  function findNearest(searchLat, searchLng, limit) {
    limit = limit || 5;
    var scored = [];
    parishes.forEach(function (p) {
      if (!p.zip) return;
      var c = parishCoords(p);
      if (!c) return;
      var miles = haversineMiles(searchLat, searchLng, c.lat, c.lng);
      scored.push({ parish: p, miles: miles });
    });
    scored.sort(function (a, b) { return a.miles - b.miles; });
    var seen = {};
    var out = [];
    for (var i = 0; i < scored.length && out.length < limit; i++) {
      var id = scored[i].parish.id || scored[i].parish.slug;
      if (seen[id]) continue;
      seen[id] = true;
      out.push(scored[i]);
    }
    return out;
  }

  function lookupZipCoords(zip) {
    if (zipCoords[zip]) {
      return Promise.resolve(zipCoords[zip]);
    }
    return fetch("https://api.zippopotam.us/us/" + zip)
      .then(function (r) {
        if (!r.ok) throw new Error("zip not found");
        return r.json();
      })
      .then(function (d) {
        var places = d.places || [];
        if (!places.length) throw new Error("no place");
        var c = {
          lat: parseFloat(places[0].latitude),
          lng: parseFloat(places[0].longitude),
          place: places[0]["place name"] || "",
          state: places[0]["state abbreviation"] || ""
        };
        zipCoords[zip] = c;
        return c;
      });
  }

  function doSearch(zip) {
    zip = normalizeZip(zip);
    if (zip.length !== 5) {
      results.innerHTML = "<p class=\"empty\">Please enter a 5-digit ZIP code.</p>";
      return;
    }

    var exact = parishes.filter(function (p) { return p.zip === zip; });
    if (exact.length) {
      renderList(exact.map(function (p) { return { parish: p }; }));
      return;
    }

    results.innerHTML = "<p class=\"empty\">No parish in ZIP <strong>" + zip + "</strong>. Finding nearest…</p>";

    lookupZipCoords(zip)
      .then(function (c) {
        var nearest = findNearest(c.lat, c.lng, 5);
        if (!nearest.length) {
          results.innerHTML =
            "<p class=\"empty\">No parish in ZIP <strong>" + zip +
            "</strong>, and distance data is unavailable. Try a ZIP in Florida or New York.</p>";
          return;
        }
        var placeNote = c.place ? " (" + c.place + ", " + c.state + ")" : "";
        renderList(nearest, {
          headerHtml:
            "No parish is listed in ZIP <strong>" + zip + "</strong>" + placeNote +
            ". Closest parishes in our dataset:"
        });
      })
      .catch(function () {
        results.innerHTML =
          "<p class=\"empty\">No parish in ZIP <strong>" + zip +
          "</strong>. Could not look up that ZIP location. Try a ZIP in Florida or New York.</p>";
      });
  }

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
    fetch("data/zip_coords.json").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ]).then(function (parts) {
    zipCoords = parts[37] || {};
    var seen = {};
    parishes = [];
    parts.slice(0, 37).forEach(function (arr) {
      if (!Array.isArray(arr)) return;
      arr.forEach(function (p) {
        var k = (p.zip || "") + "|" + (p.slug || p.id || "");
        if (seen[k]) return;
        seen[k] = true;
        parishes.push(p);
      });
    });
    dataReady = true;
    var withZip = parishes.filter(function (p) { return p.zip; }).length;
    var ny = parishes.filter(function (p) { return (p.state || "") === "NY"; }).length;
    var fl = parishes.filter(function (p) { return (p.state || "") === "FL"; }).length;
    setStatus(
      "Loaded " + parishes.length + " parishes (" + withZip + " with ZIP) — FL: " + fl + ", NY: " + ny + "."
    );

    var params = new URLSearchParams(window.location.search);
    var qZip = params.get("zip");
    if (qZip) {
      input.value = normalizeZip(qZip);
      doSearch(qZip);
    }
  }).catch(function () {
    setStatus("Could not load parish data.");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    doSearch(input.value);
  });
})();
