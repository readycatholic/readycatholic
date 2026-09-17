/**
 * Ready Catholic — Find your local parish (ZIP lookup)
 * Client-side only; data from /parish/data/parishes.json
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
          " parishes — Archdiocese of Chicago sample). Not linked from homepage yet.";
      }
    })
    .catch(() => {
      if (status) status.textContent = "Could not load parish data.";
    });

  function normalizeZip(raw) {
    const digits = String(raw || "").replace(/\D/g, "");
    return digits.slice(0, 5);
  }

  function render(list, zip) {
    results.innerHTML = "";
    if (!list.length) {
      results.innerHTML =
        "<p class=\"empty\">No parishes found for ZIP <strong>" +
        zip +
        "</strong> in the pilot dataset. Coverage is limited to a Chicago-area sample until the first diocese is complete.</p>";
      return;
    }
    const ul = document.createElement("ul");
    ul.className = "parish-list";
    list.forEach((p) => {
      const li = document.createElement("li");
      li.className = "parish-card";
      const title = document.createElement("h3");
      title.textContent = p.name;
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
      if (p.website) {
        const a = document.createElement("a");
        a.href = p.website;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "Parish website";
        li.appendChild(a);
      }
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
