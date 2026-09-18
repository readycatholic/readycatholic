/**
 * Ready Catholic — Find your local parish (ZIP lookup)
 * Font: Verdana | Data: parishes.json (combined PB + Orlando)
 */
(function () {
  const form = document.getElementById("parish-search-form");
  const input = document.getElementById("zip-input");
  const results = document.getElementById("parish-results");
  const status = document.getElementById("parish-status");

  if (!form || !input || !results) return;

  let parishes = [];

  function setStatus(msg) {
    if (status) status.textContent = msg;
  }

  Promise.all([
    fetch("data/parishes.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
    fetch("data/parishes-orlando.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
  ]).then(function (parts) {
    var seen = {};
    parishes = [];
    parts.forEach(function (arr) {
      if (!Array.isArray(arr)) return;
      arr.forEach(function (p) {
        var k = (p.zip || "") + "|" + (p.slug || p.id || "");
        if (seen[k]) return;
        seen[k] = true;
        parishes.push(p);
      });
    });
    var withZip = parishes.filter(function (p) { return p.zip; }).length;
    var pb = parishes.filter(function (p) { return p.diocese_id === "palm-beach"; }).length;
    var orl = parishes.filter(function (p) { return p.diocese_id === "orlando"; }).length;
    setStatus(
      "Loaded " + parishes.length + " parishes (" + withZip + " with ZIP) — Palm Beach: " + pb + ", Orlando: " + orl + ". Font: Verdana. Not linked from homepage yet."
    );
  }).catch(function () {
    setStatus("Could not load parish data.");
  });

  function normalizeZip(raw) {
    return String(raw || "").replace(/\D/g, "").slice(0, 5);
  }

  function parishUrl(p) {
    var slug = p.slug || p.id;
    if (p.zip && slug) {
      return "detail.html?zip=" + encodeURIComponent(p.zip) + "&slug=" + encodeURIComponent(slug);
    }
    return "detail.html?slug=" + encodeURIComponent(slug);
  }

  function render(list, zip) {
    results.innerHTML = "";
    if (!list.length) {
      results.innerHTML =
        "<p class=\"empty\">No parishes found for ZIP <strong>" +
        zip +
        "</strong>. Try a ZIP in the Diocese of Palm Beach or Diocese of Orlando.</p>";
      return;
    }
    var ul = document.createElement("ul");
    ul.className = "parish-list";
    list.forEach(function (p) {
      var li = document.createElement("li");
      li.className = "parish-card";
      var title = document.createElement("h3");
      var link = document.createElement("a");
      link.href = parishUrl(p);
      link.textContent = p.name;
      title.appendChild(link);
      li.appendChild(title);
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
        phone.textContent = p.phone;
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

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var zip = normalizeZip(input.value);
    if (zip.length !== 5) {
      results.innerHTML = "<p class=\"empty\">Please enter a 5-digit ZIP code.</p>";
      return;
    }
    render(parishes.filter(function (p) { return p.zip === zip; }), zip);
  });
})();
