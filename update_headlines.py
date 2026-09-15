#!/usr/bin/env python3
"""Refresh Ready Catholic headlines without replacing the approved visual design."""
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import feedparser
from bs4 import BeautifulSoup, NavigableString

ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "index.html"


def story_key(item):
    title = "".join(ch.lower() for ch in item["title"] if ch.isalnum())
    link = item["link"].split("?", 1)[0].rstrip("/").lower()
    return title, link


def published_at(entry):
    """Return the RSS publication/update time as an aware UTC datetime."""
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if parsed:
        try:
            return datetime(*parsed[:6], tzinfo=timezone.utc)
        except (TypeError, ValueError):
            pass
    return None


SOURCES = {
    "Vatican News": "https://www.vaticannews.va/en.rss.xml",
    "Catholic News Agency": "https://catholicnewsagency.com/rss/",
    "America Magazine": "https://americamagazine.org/feed/",
    "Catholic World Report": "https://www.catholicworldreport.com/feed/",
    "Crux": "https://cruxnow.com/feed/",
    "First Things": "https://firstthings.com/feed/",
    "Fides News Agency": "https://fides.org/rss.xml",
    "Catholic Exchange": "https://catholicexchange.com/feed",
    "Catholic News Ireland": "https://catholicnews.ie/rss.xml",
    "The Catholic Weekly": "https://catholicweekly.com.au/feed/",
    "U.S. Catholic": "https://uscatholic.org/feed/",
    "Cal Catholic": "https://cal-catholic.com/feed/",
    "Catholic News": "https://catholicnews.com/feed/",
    "Catholic League": "https://catholicleague.org/feed/",
    "Crisis Magazine": "https://crisismagazine.com/feed/",
    "The Catholic Thing": "https://thecatholicthing.org/feed/",
    "InfoVaticana": "https://infovaticana.com/feed/",
    "Hollywood Catholic": "https://hollywoodcatholic.com/feed/",
    "The Catholic Crusade": "https://thecatholiccrusade.com/feed/",
    "Aleteia": "https://aleteia.org/feed/",
    "OSV News": "https://www.osvnews.com/feed/",
    "The Pillar": "https://www.pillarcatholic.com/feed",
    "Zenit": "https://zenit.org/feed/",
    "LifeSiteNews": "https://www.lifesitenews.com/rss/global",
    "ChurchPOP": "https://www.churchpop.com/feed/",
    "Catholic Daily Reflections": "https://catholic-daily-reflections.com/feed/",
}


def collect():
    all_items = []
    now = datetime.now(timezone.utc)
    # Read more than the old five-entry limit so that a busy feed cannot hide
    # today's stories behind older items. Prefer the newest 36 hours, while
    # retaining older items as a fallback when a source has not published recently.
    recent_cutoff = now.timestamp() - (36 * 60 * 60)

    for source, url in SOURCES.items():
        feed = feedparser.parse(url)
        source_items = []
        for entry in feed.entries[:15]:
            title = entry.get("title", "").strip()
            link = entry.get("link", "#")
            published = published_at(entry)
            image = ""
            media = entry.get("media_content") or entry.get("media_thumbnail") or []
            if media and isinstance(media, list):
                image = media[0].get("url", "")
            if not image and entry.get("enclosures"):
                image = entry.enclosures[0].get("href", "")
            if title and link:
                source_items.append({
                    "title": title,
                    "link": link,
                    "source": source,
                    "image": image,
                    "published": published,
                })

        # Keep recent stories first. If a feed supplies no usable dates, keep
        # its feed order as a fallback. Older stories remain available only
        # when needed to avoid leaving a category empty.
        dated = [item for item in source_items if item["published"] is not None]
        recent = [item for item in dated if item["published"].timestamp() >= recent_cutoff]
        fallback = [item for item in source_items if item not in recent]
        if recent:
            source_items = sorted(recent, key=lambda x: x["published"], reverse=True) + fallback
        else:
            source_items = sorted(dated, key=lambda x: x["published"], reverse=True) + [item for item in source_items if item not in dated]
        all_items.extend(source_items)

    # Across all publishers, newest stories should be considered first.
    all_items.sort(key=lambda x: x["published"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)

    categories = {"breaking": [], "vatican": [], "america": [], "faith": [], "culture_life": [], "culture": [], "world": [], "prolife": [], "media": [], "local": []}
    prolife_sources = {"Catholic League", "Crisis Magazine", "LifeSiteNews", "OSV News", "Catholic Exchange"}
    media_sources = {"Hollywood Catholic", "ChurchPOP", "The Pillar"}
    local_sources = {"Catholic News", "Catholic News Ireland", "The Catholic Weekly", "Cal Catholic", "U.S. Catholic"}
    for item in all_items:
        text = item["title"].lower()
        source = item["source"]
        if source in prolife_sources or any(x in text for x in ("abortion", "pro-life", "assisted suicide", "human dignity")):
            categories["prolife"].append(item)
        if source in media_sources or any(x in text for x in ("podcast", "radio", "film", "video", "concert", "music")):
            categories["media"].append(item)
        if source in local_sources:
            categories["local"].append(item)
        if source in {"Vatican News", "The Pillar", "OSV News"} and not categories["breaking"]:
            categories["breaking"].append(item)
        if source == "Vatican News" or "pope" in text or "vatican" in text:
            categories["vatican"].append(item)
        elif source in {"OSV News", "The Pillar"} or any(x in text for x in ("us ", "america", "canada")):
            categories["america"].append(item)
        elif source in {"Aleteia", "Catholic Daily Reflections"} or "faith" in text or "spiritual" in text:
            categories["faith"].append(item)
        elif source in {"LifeSiteNews", "ChurchPOP"} or any(x in text for x in ("life", "culture", "family")):
            categories["culture_life"].append(item)
        else:
            categories["world"].append(item)

    unique_breaking = []
    seen_sources = set()
    for item in categories["breaking"] + all_items:
        if item["source"] not in seen_sources:
            unique_breaking.append(item)
            seen_sources.add(item["source"])
        if len(unique_breaking) == 3:
            break
    categories["breaking"] = unique_breaking
    used = {story_key(item) for item in categories["breaking"]}
    for key in ("vatican", "america", "faith", "culture_life", "culture", "world", "prolife", "media", "local"):
        filtered = []
        for item in categories[key]:
            item_key = story_key(item)
            title_key = item_key[0]
            if item_key in used or any(title_key and title_key == existing[0] for existing in used):
                continue
            used.add(item_key)
            filtered.append(item)
        categories[key] = filtered
    for key in categories:
        categories[key] = categories[key][:8]
    main_keys = {story_key(item) for key in ("breaking", "vatican", "america", "faith", "culture_life", "world") for item in categories[key]}
    specialty_rules = {
        "prolife": lambda item: item["source"] in {"Catholic League", "Crisis Magazine", "LifeSiteNews", "OSV News", "Catholic Exchange"} or any(x in item["title"].lower() for x in ("abortion", "pro-life", "assisted suicide", "human dignity")),
        "culture": lambda item: item["source"] in {"America Magazine", "First Things", "The Catholic Thing", "U.S. Catholic", "The Catholic Weekly", "Hollywood Catholic"} or any(x in item["title"].lower() for x in ("culture", "book", "film", "music", "art", "literature", "monastery")),
        "media": lambda item: item["source"] in {"Vatican News", "Catholic News Agency", "Hollywood Catholic", "The Pillar", "ChurchPOP"} and (item.get("image") or any(x in item["title"].lower() for x in ("podcast", "radio", "video", "film", "concert", "music"))),
        "local": lambda item: item["source"] in {"Catholic News", "Catholic News Ireland", "The Catholic Weekly", "Cal Catholic", "U.S. Catholic"},
    }
    for key, rule in specialty_rules.items():
        selected = []
        seen = {story_key(item) for item in categories["breaking"]} if key == "culture" else set(main_keys)
        for item in all_items:
            item_key = story_key(item)
            if rule(item) and item_key not in seen:
                selected.append(item)
                seen.add(item_key)
            if len(selected) == 8:
                break
        categories[key] = selected
        if key == "culture":
            reserved = {story_key(item) for item in selected}
            for main_key in ("vatican", "america", "faith", "culture_life", "world"):
                categories[main_key] = [item for item in categories[main_key] if story_key(item) not in reserved]
    return categories


def item_node(soup, item, featured=False):
    cls = "featured-item" if featured else "news-item"
    div = soup.new_tag("div", attrs={"class": cls})
    a = soup.new_tag("a", href=item["link"], target="_blank", rel="noopener noreferrer")
    a.string = item["title"]
    div.append(a)
    src = soup.new_tag("div", attrs={"class": "source"})
    src.string = item["source"]
    div.append(src)
    return div


def specialty_node(soup, item, media=False):
    div = soup.new_tag("div", attrs={"class": "category-item"})
    if media and item.get("image"):
        img = soup.new_tag("img", src=item["image"], alt="", attrs={"class": "media-thumb", "loading": "lazy"})
        div.append(img)
    a = soup.new_tag("a", href=item["link"], target="_blank", rel="noopener noreferrer")
    a.string = item["title"]
    div.append(a)
    src = soup.new_tag("div", attrs={"class": "source"})
    src.string = item["source"]
    div.append(src)
    return div


def replace_between(parent, start_node, stop_classes, new_nodes):
    node = start_node.next_sibling
    while node:
        nxt = node.next_sibling
        if getattr(node, "get", lambda *_: None)("class") and any(c in node.get("class", []) for c in stop_classes):
            break
        if isinstance(node, NavigableString) and not node.strip():
            node.extract()
        else:
            node.extract()
        node = nxt
    for new_node in reversed(new_nodes):
        start_node.insert_after(new_node)


def main():
    categories = collect()
    soup = BeautifulSoup(INDEX.read_text(encoding="utf-8"), "html.parser")

    featured = soup.select_one(".featured-section")
    h2 = featured.select_one("h2")
    replace_between(featured, h2, [], [item_node(soup, x, True) for x in categories["breaking"]])

    mapping = {
        "VATICAN & POPE": "vatican",
        "CHURCH IN AMERICA": "america",
        "FAITH & SPIRITUALITY": "faith",
        "CULTURE & LIFE": "culture_life",
        "WORLD CHURCH": "world",
    }
    headers = soup.select(".section-header")
    for header in headers:
        key = mapping.get(header.get_text(" ", strip=True))
        if not key:
            continue
        replace_between(header.parent, header, ["section-header", "category-ad"], [item_node(soup, x) for x in categories[key]])

    displayed_main = {
        story_key(item)
        for key in ("vatican", "america", "faith", "culture_life", "world")
        for item in categories[key]
    }
    displayed_specialty = set(displayed_main)
    for panel in soup.select(".category-panel"):
        key = panel.get("data-specialty")
        target = panel.select_one(".category-items")
        if target and key in categories:
            target.clear()
            specialty_items = [item for item in categories[key] if story_key(item) not in displayed_specialty]
            for item in specialty_items[:4]:
                target.append(specialty_node(soup, item, media=(key == "media")))
                displayed_specialty.add(story_key(item))

    timestamp = soup.select_one(".timestamp")
    if timestamp:
        timestamp.string = datetime.now(ZoneInfo("America/Chicago")).strftime("%A, %B %d, %Y")
    INDEX.write_text(str(soup), encoding="utf-8")
    print("Updated Ready Catholic headlines while preserving the visual design.")


if __name__ == "__main__":
    main()
