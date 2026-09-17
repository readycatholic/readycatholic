#!/usr/bin/env python3
"""Refresh Ready Catholic headlines without replacing the approved visual design."""
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo
import re
from collections import Counter

import feedparser
from bs4 import BeautifulSoup, NavigableString

ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "index.html"

_LIFESITE_DIGEST = re.compile(r"^(World|Freedom|Catholic|Video)\s+\d{2}\.\d{2}\.\d{2}$", re.I)

MAIN_LIMIT = 5
SPECIALTY_LIMIT = 4
# Max items from the same publisher in one main column
MAX_PER_SOURCE = 2


def story_key(item):
    title = "".join(ch.lower() for ch in item["title"] if ch.isalnum())
    link = item["link"].split("?", 1)[0].rstrip("/").lower()
    return title, link


def published_at(entry):
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if parsed:
        try:
            return datetime(*parsed[:6], tzinfo=timezone.utc)
        except (TypeError, ValueError):
            pass
    return None


def is_lifesite_digest(title, link):
    if "/email/" in (link or "").lower():
        return True
    if title and _LIFESITE_DIGEST.match(title.strip()):
        return True
    return False


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
    "LifeSiteNews": "https://www.lifesitenews.com/feed/",
    "ChurchPOP": "https://www.churchpop.com/feed/",
    "Catholic Daily Reflections": "https://catholic-daily-reflections.com/feed/",
    "National Catholic Register": "https://www.ncregister.com/feeds/general-news.xml",
    "Catholic Culture": "https://feeds.feedburner.com/CatholicWorldNewsFeatureStories",
    "The Catholic Herald": "https://thecatholicherald.com/feed/",
    "Catholic Review": "https://catholicreview.org/feed/",
    "The Wanderer": "https://thewandererpress.com/feed/",
    "The Remnant": "https://www.remnantnewspaper.com/feed/",
    "LiCAS.news": "https://www.licas.news/feed/",
    "The Irish Catholic": "https://www.irishcatholic.com/feed/",
    "B.C. Catholic": "https://bccatholic.ca/content/feed",
    "Catholic Online": "https://www.catholic.org/xml/rss_thefeed.php",
    "New Liturgical Movement": "https://www.newliturgicalmovement.org/feeds/posts/default",
    "Spirit Daily": "https://spiritdaily.com/feed/",
    "Big Pulpit": "https://bigpulpit.com/feed/",
    "Catholic Stand": "https://catholicstand.com/feed/",
    "Orange County Catholic": "https://www.occatholic.com/feed/",
    "The Catholic Telegraph": "https://thecatholictelegraph.com/feed/",
    "GCatholic Appointments": "https://gcatholic.org/rss/recent.rss",
    "The Jesuit Post": "https://thejesuitpost.org/feed/",
    "National Catholic Reporter": "https://ncronline.org/rss.xml",
    "Word on Fire": "https://www.wordonfire.org/articles/feed/",
    "Rome Reports": "https://www.romereports.com/en/feed/",
    "uCatholic": "https://ucatholic.com/feed/",
}

# Pure wire / Rome sources — strong Vatican default
VATICAN_SOURCES = {
    "Vatican News", "Rome Reports", "Zenit", "InfoVaticana",
    "GCatholic Appointments", "Fides News Agency",
}
# Strong U.S./Canada diocesan or domestic wires (topic can still override)
AMERICA_STRONG = {
    "OSV News", "The Pillar", "Catholic Review",
    "Orange County Catholic", "The Catholic Telegraph", "Cal Catholic",
    "Catholic League", "U.S. Catholic", "B.C. Catholic",
}
# These used to auto-America; now only if geo keywords match
AMERICA_SOFT = {
    "National Catholic Register", "Catholic News Agency", "Crux",
    "National Catholic Reporter",
}
FAITH_SOURCES = {
    "Aleteia", "Word on Fire", "New Liturgical Movement",
    "The Jesuit Post", "Catholic Stand", "Spirit Daily",
}
PRAYER_SOURCES = {
    "uCatholic", "Catholic Daily Reflections", "The Catholic Crusade", "Catholic Online",
}
CULTURE_SOURCES = {
    "ChurchPOP", "Hollywood Catholic", "America Magazine", "First Things",
    "The Catholic Thing", "Crisis Magazine", "Catholic World Report",
}
MEDIA_SOURCES = {"Hollywood Catholic", "ChurchPOP"}
LOCAL_SOURCES = {
    "Catholic News", "Catholic News Ireland", "The Catholic Weekly",
    "Cal Catholic", "U.S. Catholic", "Orange County Catholic",
    "The Catholic Telegraph", "Catholic Review", "B.C. Catholic",
}
BREAKING_SOURCES = {"Vatican News", "The Pillar", "OSV News", "Catholic News Agency"}

PRAYER_KEYWORDS = (
    "saint of the day", "mass readings", "daily readings", "prayer of the day",
    "rosary", "novena", "chaplet", "adoration", "devotion", "litany",
    "morning prayer", "evening prayer", "divine mercy",
)
PROLIFE_KEYWORDS = (
    "abortion", "pro-life", "prolife", "pro life", "assisted suicide",
    "euthanasia", "planned parenthood", "roe v", "dobbs",
)
VATICAN_KEYWORDS = (
    "pope leo", "pope francis", "holy see", "vatican", "pontiff",
    "jubilee year", "synod of bishops", "roman curia", "apostolic",
)
AMERICA_KEYWORDS = (
    "united states", "u.s.", "us bishops", "usccb", "american",
    "canada", "canadian", "archdiocese of", "diocese of",
    "joliet", "baltimore", "philadelphia", "los angeles", "new york",
)
WORLD_GEO = (
    "mexico", "mexican", "france", "french", "china", "chinese",
    "nigeria", "uganda", "philippines", "brazil", "brazil",
    "germany", "german", "poland", "ukraine", "ukrainian",
    "india", "pakistan", "syria", "iraq", "holy land", "israel",
    "gaza", "africa", "asia", "europe", "australia", "ireland",
    "britain", "uk ", "england", "scotland", "latin america",
)
FAITH_KEYWORDS = (
    "homily", "spiritual", "faith formation", "evangelization",
    "theology", "saint ", "st.", "liturgy", "catechism",
)
CULTURE_KEYWORDS = (
    "culture", "family", "marriage", "book review", "film",
    "music", "art", "literature", "feminism", "gender",
    "transgender", "ideology", "university", "campus",
)


def is_prolife_topic(text):
    return any(k in text for k in PROLIFE_KEYWORDS)


def is_vatican_topic(text):
    return any(k in text for k in VATICAN_KEYWORDS)


def is_america_topic(text):
    return any(k in text for k in AMERICA_KEYWORDS)


def is_world_geo(text):
    return any(k in text for k in WORLD_GEO)


def is_prayer_topic(text):
    return any(k in text for k in PRAYER_KEYWORDS)


def is_faith_topic(text):
    return any(k in text for k in FAITH_KEYWORDS)


def is_culture_topic(text):
    return any(k in text for k in CULTURE_KEYWORDS)


def classify_main(item):
    """Topic-first classification for main columns. Returns category key."""
    text = item["title"].lower()
    source = item["source"]

    # 1. Prayer (very specific)
    if source in PRAYER_SOURCES or is_prayer_topic(text):
        return "prayer"

    # 2. Vatican — topic or pure Rome wires
    if source in VATICAN_SOURCES or is_vatican_topic(text):
        return "vatican"

    # 3. America — strong domestic sources OR soft sources with geo keywords
    if source in AMERICA_STRONG or is_america_topic(text):
        # Foreign geo in title still wins for soft routing below
        if is_world_geo(text) and not is_america_topic(text):
            return "world"
        return "america"
    if source in AMERICA_SOFT and is_america_topic(text):
        return "america"

    # 4. World geo (Mexico, China, France, etc.) before faith/culture defaults
    if is_world_geo(text):
        return "world"

    # 5. Faith formation
    if source in FAITH_SOURCES or is_faith_topic(text):
        return "faith"

    # 6. Culture & life (includes gender/ideology/culture commentary)
    if source in CULTURE_SOURCES or is_culture_topic(text):
        return "culture_life"

    # 7. Soft America sources with no other signal → America
    if source in AMERICA_SOFT:
        return "america"

    # 8. Everything else → World (no longer LifeSite-only dump via source)
    return "world"


def diversify(items, limit, max_per_source=MAX_PER_SOURCE):
    """Keep order but cap how many items come from one publisher."""
    counts = Counter()
    out = []
    for item in items:
        src = item["source"]
        if counts[src] >= max_per_source:
            continue
        out.append(item)
        counts[src] += 1
        if len(out) >= limit:
            break
    return out


def collect():
    all_items = []
    now = datetime.now(timezone.utc)
    recent_cutoff = now.timestamp() - (36 * 60 * 60)

    for source, url in SOURCES.items():
        feed = feedparser.parse(url)
        source_items = []
        for entry in feed.entries[:15]:
            title = entry.get("title", "").strip()
            link = entry.get("link", "#")
            if source == "LifeSiteNews" and is_lifesite_digest(title, link):
                continue
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

        dated = [item for item in source_items if item["published"] is not None]
        recent = [item for item in dated if item["published"].timestamp() >= recent_cutoff]
        fallback = [item for item in source_items if item not in recent]
        if recent:
            source_items = sorted(recent, key=lambda x: x["published"], reverse=True) + fallback
        else:
            source_items = sorted(dated, key=lambda x: x["published"], reverse=True) + [
                item for item in source_items if item not in dated
            ]
        all_items.extend(source_items)

    all_items.sort(
        key=lambda x: x["published"] or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )

    categories = {
        "breaking": [], "vatican": [], "america": [], "faith": [], "prayer": [],
        "culture_life": [], "culture": [], "world": [],
        "prolife": [], "media": [], "local": [],
    }

    for item in all_items:
        text = item["title"].lower()
        source = item["source"]

        # Specialty: pro-life requires TOPIC keywords (not just LifeSite source)
        if is_prolife_topic(text):
            categories["prolife"].append(item)
        if source in MEDIA_SOURCES or any(
            x in text for x in ("podcast", "radio show", "film review", "concert")
        ):
            categories["media"].append(item)
        if source in LOCAL_SOURCES:
            categories["local"].append(item)

        if source in BREAKING_SOURCES and len(categories["breaking"]) < 6:
            categories["breaking"].append(item)

        # Main columns — topic-first
        cat = classify_main(item)
        categories[cat].append(item)

    # Breaking: unique sources, max 3
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
    for key in (
        "vatican", "america", "faith", "prayer", "culture_life", "culture",
        "world", "prolife", "media", "local",
    ):
        filtered = []
        for item in categories[key]:
            item_key = story_key(item)
            title_key = item_key[0]
            if item_key in used or any(title_key and title_key == existing[0] for existing in used):
                continue
            used.add(item_key)
            filtered.append(item)
        categories[key] = filtered

    # Cap + diversify main columns
    for key in ("vatican", "america", "faith", "prayer", "culture_life", "world"):
        categories[key] = diversify(categories[key], MAIN_LIMIT)
    for key in ("prolife", "media", "local", "culture"):
        categories[key] = diversify(categories[key], SPECIALTY_LIMIT, max_per_source=SPECIALTY_LIMIT)

    main_keys = {
        story_key(item)
        for key in ("breaking", "vatican", "america", "faith", "prayer", "culture_life", "world")
        for item in categories[key]
    }

    # Rebuild specialty with tight pro-life rule
    specialty_rules = {
        "prolife": lambda item: is_prolife_topic(item["title"].lower()),
        "culture": lambda item: (
            item["source"] in CULTURE_SOURCES
            or is_culture_topic(item["title"].lower())
        ),
        "media": lambda item: (
            item["source"] in MEDIA_SOURCES
            and (
                item.get("image")
                or any(x in item["title"].lower() for x in ("podcast", "radio", "video", "film", "concert", "music"))
            )
        ),
        "local": lambda item: item["source"] in LOCAL_SOURCES,
    }
    for key, rule in specialty_rules.items():
        selected = []
        seen = {story_key(item) for item in categories["breaking"]} if key == "culture" else set(main_keys)
        src_counts = Counter()
        for item in all_items:
            item_key = story_key(item)
            if not rule(item) or item_key in seen:
                continue
            if src_counts[item["source"]] >= MAX_PER_SOURCE and key == "prolife":
                continue
            selected.append(item)
            seen.add(item_key)
            src_counts[item["source"]] += 1
            if len(selected) == SPECIALTY_LIMIT:
                break
        categories[key] = selected
        if key == "culture":
            reserved = {story_key(item) for item in selected}
            for main_key in ("vatican", "america", "faith", "prayer", "culture_life", "world"):
                categories[main_key] = diversify(
                    [item for item in categories[main_key] if story_key(item) not in reserved],
                    MAIN_LIMIT,
                )
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
        "PRAYER & DEVOTION": "prayer",
        "CULTURE & LIFE": "culture_life",
        "WORLD CHURCH": "world",
    }
    headers = soup.select(".section-header")
    for header in headers:
        key = mapping.get(header.get_text(" ", strip=True))
        if not key:
            continue
        replace_between(
            header.parent, header, ["section-header", "category-ad"],
            [item_node(soup, x) for x in categories[key]],
        )

    displayed_main = {
        story_key(item)
        for key in ("vatican", "america", "faith", "prayer", "culture_life", "world")
        for item in categories[key]
    }
    displayed_specialty = set(displayed_main)
    for panel in soup.select(".category-panel"):
        key = panel.get("data-specialty")
        target = panel.select_one(".category-items")
        if target and key in categories:
            target.clear()
            specialty_items = [
                item for item in categories[key] if story_key(item) not in displayed_specialty
            ]
            for item in specialty_items[:SPECIALTY_LIMIT]:
                target.append(specialty_node(soup, item, media=(key == "media")))
                displayed_specialty.add(story_key(item))

    timestamp = soup.select_one(".timestamp")
    if timestamp:
        timestamp.string = datetime.now(ZoneInfo("America/Chicago")).strftime("%A, %B %d, %Y")
    INDEX.write_text(str(soup), encoding="utf-8")
    print("Updated Ready Catholic headlines while preserving the visual design.")


if __name__ == "__main__":
    main()
