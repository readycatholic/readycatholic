#!/usr/bin/env python3
"""Generate SEO-friendly static parish pages from parish JSON data."""
import json
import html
import re
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "parish" / "data"
OUT = ROOT / "parish"
SITE = "https://readycatholic.github.io/readycatholic"

def esc(s):
    return html.escape(str(s or ""), quote=True)

def format_phone(raw):
    """Normalize any phone string to (xxx) xxx-xxxx when possible."""
    if not raw:
        return ""
    digits = re.sub(r"\D", "", str(raw))
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return str(raw).strip()

def load_parishes():
    files = [
        "parishes.json",
        "parishes-orlando.json",
        "parishes-pb-extra.json",
        "parishes-miami.json",
        "parishes-miami-b.json",
        "parishes-venice.json",
        "parishes-venice-b.json",
        "parishes-stpete.json",
        "parishes-stpete-b.json",
        "parishes-staug.json",
        "parishes-staug-b.json",
        "parishes-pt.json",
        "parishes-pt-b.json",
        "parishes-archny.json",
        "parishes-archny-b.json",
        "parishes-archny-c.json",
        "parishes-archny-d.json",
        "parishes-archny-e.json",
        "parishes-archny-f.json",
        "parishes-archny-g.json",
        "parishes-archny-h.json",
        "parishes-archny-i.json",
        "parishes-archny-j.json",
        "parishes-archny-k.json",
        "parishes-albany.json",
        "parishes-albany-b.json",
        "parishes-albany-c.json",
        "parishes-brooklyn.json",
        "parishes-brooklyn-b.json",
        "parishes-brooklyn-c.json",
        "parishes-brooklyn-d.json",
        "parishes-buffalo.json",
        "parishes-buffalo-b.json",
        "parishes-buffalo-c.json",
        "parishes-ogdensburg.json",
        "parishes-ogdensburg-b.json",
        "parishes-ogdensburg-c.json",
        "parishes-rochester.json",
        "parishes-rochester-b.json",
        "parishes-rochester-c.json",
        "parishes-rvc.json",
        "parishes-rvc-b.json",
        "parishes-rvc-c.json",
        "parishes-rvc-d.json",
        "parishes-syr.json",
        "parishes-syr-b.json",
        "parishes-syr-c.json",
        "parishes-syr-d.json",
        "parishes-chicago.json",
        "parishes-chicago-a2.json",
        "parishes-chicago-a3.json",
        "parishes-chicago-b.json",
        "parishes-chicago-b2.json",
        "parishes-chicago-b3.json",
        "parishes-chicago-b4.json",
        "parishes-chicago-b5.json",
        "parishes-chicago-b6.json",
        "parishes-chicago-b7.json",
        "parishes-chicago-b8.json",
        "parishes-chicago-b9.json",
        "parishes-chicago-b10.json",
        "parishes-belleville.json",
        "parishes-belleville-b.json",
        "parishes-belleville-c.json",
    ]
    seen = set()
    out = []
    for name in files:
        path = DATA / name
        if not path.exists():
            continue
        for p in json.loads(path.read_text(encoding="utf-8")):
            k = (p.get("zip"), p.get("slug") or p.get("id"))
            if k in seen:
                continue
            seen.add(k)
            out.append(p)
    return out

def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")

def parish_slug(p):
    """Full parish name in the URL path — never abbreviated source codes."""
    name = (p.get("name") or "").strip()
    city = (p.get("city") or "").strip()
    state = (p.get("state") or "").strip()
    parts = [name]
    if city:
        parts.append(city)
    if state:
        parts.append(state)
    slug = slugify(" ".join(parts))
    if not slug:
        slug = slugify(p.get("slug") or p.get("id") or "parish")
    return slug

def main():
    parishes = load_parishes()
    sitemap = []
    count = 0
    for p in parishes:
        zipc = (p.get("zip") or "").strip()
        slug = parish_slug(p)
        if not zipc or not slug:
            continue
        name = p.get("name") or "Catholic Parish"
        city = p.get("city") or ""
        state = p.get("state") or "FL"
        diocese = p.get("diocese") or ""
        address = p.get("address") or ""
        phone = format_phone(p.get("phone") or "")
        website = p.get("website") or ""
        canonical = f"{SITE}/parish/{zipc}/{slug}/"
        title = f"{name} | {city}, {state} | Ready Catholic"

        suffix = " Contact info and directions on Ready Catholic."
        parts = [name]
        if city:
            parts.append(f"in {city}, {state}")
        if diocese:
            parts.append(f"({diocese})")
        if address:
            parts.append(f"Address: {address}, {city}, {state} {zipc}")
        front = " ".join(parts)
        max_front = 160 - len(suffix)
        if len(front) > max_front:
            front = front[: max_front - 1].rsplit(" ", 1)[0] + "…"
        description = front + suffix

        if address:
            addr_html = f"{esc(address)}<br>{esc(city)}, {esc(state)} {esc(zipc)}"
        else:
            addr_html = f"{esc(city)}, {esc(state)} {esc(zipc)}"
        phone_html = ""
        if phone:
            tel = re.sub(r"[^0-9+]", "", phone)
            phone_html = (
                f'<p class="label">Phone</p>'
                f'<p><a href="tel:{esc(tel)}" style="color:var(--text);text-decoration:none">{esc(phone)}</a></p>'
            )
        web_html = ""
        if website:
            disp = re.sub(r"^https?://", "", website).rstrip("/")
            web_html = (
                f'<p class="label">Website</p>'
                f'<p><a href="{esc(website)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">{esc(disp)}</a></p>'
                f'<p><a class="btn" href="{esc(website)}" target="_blank" rel="noopener noreferrer">Visit parish website</a></p>'
            )
        maps_q = ", ".join(x for x in [name, address, city, state, zipc] if x)
        maps_url = "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote(maps_q)
        jsonld = {
            "@context": "https://schema.org",
            "@type": "CatholicChurch",
            "name": name,
            "address": {
                "@type": "PostalAddress",
                "addressLocality": city or None,
                "addressRegion": state,
                "postalCode": zipc,
                "addressCountry": "US",
            },
            "url": canonical,
        }
        if address:
            jsonld["address"]["streetAddress"] = address
        if phone:
            jsonld["telephone"] = phone
        if website:
            jsonld["sameAs"] = website
        page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}"/>
<meta name="robots" content="index, follow"/>
<link rel="canonical" href="{esc(canonical)}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="{esc(title)}"/>
<meta property="og:description" content="{esc(description)}"/>
<meta property="og:url" content="{esc(canonical)}"/>
<meta property="og:site_name" content="Ready Catholic"/>
<meta property="og:locale" content="en_US"/>
<meta name="twitter:card" content="summary"/>
<meta name="twitter:title" content="{esc(title)}"/>
<meta name="twitter:description" content="{esc(description)}"/>
<meta name="geo.region" content="US-{esc(state)}"/>
<meta name="geo.placename" content="{esc(city)}"/>
<link rel="icon" href="../../../favicon.svg" type="image/svg+xml"/>
<link rel="stylesheet" href="../../css/parish.css"/>
<style>
.top-ad{{text-align:center;padding:.75rem 1rem 0}}
.top-ad a{{display:inline-block;line-height:0}}
.top-ad img{{display:block;width:min(100%,728px);height:auto;margin:0 auto;border-radius:8px}}
header{{text-align:center;padding:1.25rem 1rem 1rem;border-bottom:1px solid var(--border)}}
header a.brand{{color:var(--accent);text-decoration:none;font-size:.85rem;letter-spacing:.08em;text-transform:uppercase}}
main{{max-width:728px;margin:0 auto;padding:1.75rem 1rem 3rem}}
.crumb{{font-size:.85rem;color:var(--muted);margin-bottom:1.25rem}}
.crumb a{{color:var(--accent);text-decoration:none}}
h1{{margin:0 0 .35rem;font-size:1.65rem;font-weight:normal;color:var(--accent)}}
.diocese{{color:var(--muted);margin:0 0 1.25rem;font-size:.95rem}}
.card{{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:1.15rem 1.25rem;max-width:728px;width:100%;margin-left:auto;margin-right:auto;box-sizing:border-box}}
.card p{{margin:.4rem 0}}
.card-row{{display:flex;flex-wrap:wrap;align-items:center;gap:1.25rem}}
.card-info{{flex:1 1 280px;min-width:0}}
.card-ad{{flex:0 0 auto;margin-left:auto}}
.card-ad a{{display:block;line-height:0}}
.card-ad img{{display:block;width:300px;max-width:100%;height:auto;border-radius:8px}}
@media (max-width:720px){{
  .card-row{{flex-direction:column;align-items:stretch}}
  .card-ad{{margin-left:0;align-self:center}}
}}
.label{{color:var(--muted);font-size:.8rem;text-transform:uppercase;letter-spacing:.04em}}
a.btn{{display:inline-block;margin-top:.75rem;margin-right:.5rem;padding:.55rem .9rem;background:var(--accent);color:#1a1508;text-decoration:none;border-radius:8px;font-weight:600;font-size:.9rem}}
a.btn.secondary{{background:transparent;border:1px solid var(--border);color:var(--text)}}
.note{{font-size:.8rem;color:var(--muted);margin-top:1.5rem}}
footer{{text-align:center;padding:1.25rem;font-size:.8rem;color:var(--muted);border-top:1px solid var(--border)}}
footer a{{color:var(--accent)}}
</style>
<script type="application/ld+json">
{json.dumps(jsonld)}
</script>
</head>
<body>
<div class="top-ad">
<a aria-label="Learn more from Catholic Order of Foresters" href="https://getmyannuitycom-22173203.hubspotpagebuilder.com/readycatholic-helping-catholic-families-be-ready" rel="noopener noreferrer" target="_blank">
<img alt="Catholic Order of Foresters — Insurance shaped by Catholic values. Learn More." src="../../../COF728X90.png" width="728" height="90"/>
</a>
</div>
<header><a class="brand" href="../../../">Ready Catholic</a></header>
<main>
<p class="crumb"><a href="../../">Find a Parish</a> · ZIP {esc(zipc)}</p>
<h1>{esc(name)}</h1>
<p class="diocese">{esc(diocese)}</p>
<div class="card">
<div class="card-row">
<div class="card-info">
<p class="label">Address</p>
<p>{addr_html}</p>
{phone_html}
{web_html}
<p><a class="btn secondary" href="{esc(maps_url)}" target="_blank" rel="noopener noreferrer">Open in Maps</a></p>
</div>
<div class="card-ad">
<a href="http://fundraising.stjude.org/goto/ReadyCatholic" target="_blank" rel="noopener noreferrer sponsored" aria-label="Support St. Jude Children's Research Hospital">
<img id="stjude-ad-img" width="300" height="250" alt="St. Jude Children's Research Hospital — Let's help more kids just be kids. Learn More." src=""/>
</a>
</div>
</div>
</div>
<script src="../../js/stjude-ads.js"></script>
<p class="note">Catholic parish listing on Ready Catholic.</p>
</main>
<footer><a href="../../">← Back to parish search</a></footer>
</body>
</html>
"""
        dest = OUT / zipc / slug
        dest.mkdir(parents=True, exist_ok=True)
        (dest / "index.html").write_text(page, encoding="utf-8")
        sitemap.append(canonical)
        count += 1

    sm = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for u in sorted(set(sitemap)):
        sm.append(
            f"  <url><loc>{u}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>"
        )
    sm.append("</urlset>")
    sm_text = "\n".join(sm)
    (OUT / "sitemap-parishes.xml").write_text(sm_text, encoding="utf-8")
    (ROOT / "sitemap-parishes.xml").write_text(sm_text, encoding="utf-8")
    print(f"Generated {count} parish pages + sitemap (parish/ and root)")

if __name__ == "__main__":
    main()
