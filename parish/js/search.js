/**
 * Ready Catholic — Find your local parish (ZIP lookup)
 * Client-side only; data from /parish/data/parishes.json
 * Detail pages: /parish/{zip}/{slug}/
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
      if (status) {
        status.textContent =
          "Pilot data loaded (" +
          parishes.length +
          " sample parishes — Diocese of Palm Beach & Diocese of Orlando). Not linked from homepage yet.";
      }
    })
    .catch(() => {
      if (status) status.textContent = "Could not load parish data.";
    });

  function normalizeZip(raw) {
    const digits = String(raw || "").replace(/\D/g, "");
    return digits.slice(0, 5);
  }

  function parishUrl(p) {
    const slug = p.slug || p.id;
    return p.zip + "/" + slug + "/";
  }

  function render(list, zip) {
    results.innerHTML = "";
    if (!list.length) {
      results.innerHTML =
        "<p class=\"empty\">No parishes found for ZIP <strong>" +
        zip +
        "</strong> in the pilot dataset. Coverage is a limited Palm Beach / Orlando sample until both dioceses are complete.</p>";
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
      addr.textContent =
        p.address + ", " + p.city + ", " + p.state + " " + p.zip;
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
      results.innerHTML =
        "<p class=\"empty\">Please enter a 5-digit ZIP code.</p>";
      return;
    }
    const matches = parishes.filter((p) => p.zip === zip);
    render(matches, zip);
  });
})();
