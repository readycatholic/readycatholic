/**
 * Ready Catholic — Find your local parish (ZIP lookup)
 * Font: Verdana (via parish.css)
 * Detail: detail.html?zip=&slug=  (and legacy /zip/slug/ pages when present)
 */
(function () {
  const form = document.getElementById("parish-search-form");
  const input = document.getElementById("zip-input");
  const results = document.getElementById("parish-results");
  const status = document.getElementById("parish-status");

  if (!form || !input || !results) return;

  let parishes = [];

  fetch("data/parishes.json")
    .then((r) => r.json())
    .then((data) => {
      parishes = Array.isArray(data) ? data : [];
      const withZip = parishes.filter((p) => p.zip).length;
      if (status) {
        status.textContent =
          "Pilot loaded: " +
          parishes.length +
          " parishes (" +
          withZip +
          " with ZIP) — Palm Beach & Orlando. Font: Verdana. Not linked from homepage yet.";
      }
    })
    .catch(() => {
      if (status) status.textContent = "Could not load parish data.";
    });

  function normalizeZip(raw) {
    return String(raw || "").replace(/\D/g, "").slice(0, 5);
  }

  function parishUrl(p) {
    const slug = p.slug || p.id;
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
        "</strong> in the current dataset. Try another ZIP in the Palm Beach or Orlando areas, or check back as we fill missing ZIP codes.</p>";
      return;
    }
    const ul = document.createElement("ul");
    ul.className = "parish-list";
    list.forEach((p) => {
      const li = document.createElement("li");
      li.className = "parish-card";
      const title = document.createElement("h3");
      const link = document.createElement("a");
      link.href = parishUrl(p);
      link.textContent = p.name;
      title.appendChild(link);
      li.appendChild(title);
      const addr = document.createElement("p");
      addr.className = "addr";
      addr.textContent = [p.address, p.city, p.state, p.zip].filter(Boolean).join(", ").replace(/, (,)/g, ",");
      if (p.address) {
        addr.textContent = p.address + ", " + p.city + ", " + p.state + " " + (p.zip || "");
      } else {
        addr.textContent = p.city + ", " + p.state + (p.zip ? " " + p.zip : "");
      }
      li.appendChild(addr);
      const meta = document.createElement("p");
      meta.className = "meta";
      meta.textContent = p.diocese || "";
      li.appendChild(meta);
      if (p.phone) {
        const phone = document.createElement("p");
        phone.className = "phone";
        phone.textContent = p.phone;
        li.appendChild(phone);
      }
      const more = document.createElement("a");
      more.href = parishUrl(p);
      more.textContent = "Parish page →";
      li.appendChild(more);
      ul.appendChild(li);
    });
    results.appendChild(ul);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const zip = normalizeZip(input.value);
    if (zip.length !== 5) {
      results.innerHTML = "<p class=\"empty\">Please enter a 5-digit ZIP code.</p>";
      return;
    }
    const matches = parishes.filter((p) => p.zip === zip);
    render(matches, zip);
  });
})();
