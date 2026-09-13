#!/usr/bin/env python3
"""Refresh Ready Catholic headlines without replacing the approved visual design."""
from datetime import datetime
from html import escape
from pathlib import Path
from zoneinfo import ZoneInfo

import feedparser
from bs4 import BeautifulSoup, NavigableString

ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "index.html"

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
    for source, url in SOURCES.items():
        feed = feedparser.parse(url)
        for entry in feed.entries[:5]:
            title = entry.get("title", "").strip()
            link = entry.get("link", "#")
            if title and link:
                all_items.append({"title": title, "link": link, "source": source})

    categories = {"breaking": [], "vatican": [], "america": [], "faith": [], "culture": [], "world": []}
    for item in all_items:
        text = item["title"].lower()
        source = item["source"]
        if source in {"Vatican News", "The Pillar", "OSV News"} and not categories["breaking"]:
            categories["breaking"].append(item)
        if source == "Vatican News" or "pope" in text or "vatican" in text:
            categories["vatican"].append(item)
        elif source in {"OSV News", "The Pillar"} or any(x in text for x in ("us ", "america", "canada")):
            categories["america"].append(item)
        elif source in {"Aleteia", "Catholic Daily Reflections"} or "faith" in text or "spiritual" in text:
            categories["faith"].append(item)
        elif source in {"LifeSiteNews", "ChurchPOP"} or any(x in text for x in ("life", "culture", "family")):
            categories["culture"].append(item)
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
    for key in categories:
        categories[key] = categories[key][:15]
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
        "CULTURE & LIFE": "culture",
        "WORLD CHURCH": "world",
    }
    headers = soup.select(".section-header")
    for header in headers:
        key = mapping.get(header.get_text(" ", strip=True))
        if not key:
            continue
        replace_between(header.parent, header, ["section-header", "category-ad"], [item_node(soup, x) for x in categories[key]])

    timestamp = soup.select_one(".timestamp")
    if timestamp:
        timestamp.string = datetime.now(ZoneInfo("America/Chicago")).strftime("%A, %B %d, %Y")
    INDEX.write_text(str(soup), encoding="utf-8")
    print("Updated Ready Catholic headlines while preserving the visual design.")


if __name__ == "__main__":
    main()
