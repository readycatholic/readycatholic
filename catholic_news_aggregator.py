#!/usr/bin/env python3
"""
ReadyCatholic News Aggregator
Fetches headlines from a comprehensive list of Catholic news sources.
"""

import feedparser
from datetime import datetime
from zoneinfo import ZoneInfo
from html import escape
import os

# Comprehensive Catholic news RSS feeds
CATHOLIC_NEWS_SOURCES = {
    'Vatican News': 'https://www.vaticannews.va/en.rss.xml',
    'Catholic News Agency': 'https://www.catholicnewsagency.com/feed',
    'National Catholic Register': 'https://www.ncregister.com/feed',
    'EWTN News': 'https://www.ewtnnews.com/feed',
    'Aleteia': 'https://aleteia.org/feed/',
    'Catholic World Report': 'https://www.catholicworldreport.com/feed/',
    'Crux': 'https://cruxnow.com/feed/',
    'LifeSiteNews': 'https://www.lifesitenews.com/rss/global',
    'Big Pulpit': 'https://bigpulpit.com/feed/',
    'Catholic Culture': 'https://www.catholicculture.org/feeds/news_rss.cfm',
    'Catholic Daily Reflections': 'https://catholic-daily-reflections.com/feed/',
    'Catholic Stand': 'https://catholicstand.com/feed/',
    'Catholic Education': 'https://www.catholiceducation.org/en/component/obrss/catholic-education-resource-center.feed',
    'ChurchPOP': 'https://www.churchpop.com/feed/',
    'New Advent': 'https://www.newadvent.org/index.html', 
    'OSV News': 'https://www.osvnews.com/feed/',
    'Spirit Daily': 'https://spiritdaily.com/feed/',
    'TFP.org': 'https://www.tfp.org/feed/',
    'The Catholic Herald': 'https://thecatholicherald.com/feed/',
    'The Pillar': 'https://www.pillarcatholic.com/feed',
    'Zenit': 'https://zenit.org/feed/',
}

def fetch_headlines(max_per_source=3):
    """
    Fetch headlines from all Catholic news sources.
    Returns a dictionary organized by category.
    """
    headlines = {
        'breaking': [],
        'vatican': [],
        'america': [],
        'faith': [],
        'culture': [],
        'world': [],
        'education': []
    }
    
    print("Fetching headlines for ReadyCatholic...")
    
    for source_name, feed_url in CATHOLIC_NEWS_SOURCES.items():
        try:
            print(f"  Fetching from {source_name}...")
            feed = feedparser.parse(feed_url)
            
            if not feed.entries:
                print(f"    Warning: No entries found for {source_name}")
                continue
                
            for i, entry in enumerate(feed.entries[:max_per_source]):
                headline = {
                    'title': escape(entry.get('title', 'No title')),
                    'link': entry.get('link', '#'),
                    'source': source_name,
                }
                
                title_lower = entry.get('title', '').lower()
                
                if i == 0 and source_name in ['Vatican News', 'The Pillar', 'OSV News']:
                    headlines['breaking'].append(headline)
                elif 'pope' in title_lower or 'vatican' in title_lower or source_name == 'Vatican News':
                    headlines['vatican'].append(headline)
                elif source_name in ['National Catholic Register', 'OSV News', 'The Pillar'] or 'us' in title_lower:
                    headlines['america'].append(headline)
                elif source_name in ['Catholic Daily Reflections', 'Catholic Stand', 'Spirit Daily'] or 'faith' in title_lower:
                    headlines['faith'].append(headline)
                elif source_name in ['LifeSiteNews', 'TFP.org', 'ChurchPOP'] or 'life' in title_lower or 'culture' in title_lower:
                    headlines['culture'].append(headline)
                elif source_name in ['Crux', 'Zenit', 'The Catholic Herald'] or 'world' in title_lower:
                    headlines['world'].append(headline)
                elif source_name == 'Catholic Education' or 'school' in title_lower or 'education' in title_lower:
                    headlines['education'].append(headline)
                else:
                    headlines['faith'].append(headline)
                    
        except Exception as e:
            print(f"  Error fetching from {source_name}: {str(e)}")
    
    for category in headlines:
        limit = 15 if category != 'breaking' else 5
        headlines[category] = headlines[category][:limit]
    
    return headlines

def generate_html(headlines):
    """
    Generate the HTML file with branded ReadyCatholic content.
    """
    # 1. SET TIMEZONE TO EST AND FORMAT DATE
    now_est = datetime.now(ZoneInfo("America/New_York"))
    date_string = now_est.strftime('%A, %B %d, %Y')
    
    def format_items(items):
        html = ""
        for item in items:
            html += f'''
                <div class="news-item">
                    <a href="{item['link']}" target="_blank">{item['title']}</a>
                    <div class="source">{item['source']}</div>
                </div>
            '''
        return html

    def format_featured(items):
        html = ""
        for item in items:
            html += f'''
                <div class="featured-item">
                    <a href="{item['link']}" target="_blank">{item['title']}</a>
                    <div class="source">{item['source']}</div>
                </div>
            '''
        return html

    html_template = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>READY CATHOLIC</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Courier New', monospace; background-color: #f5f5f5; color: #333; line-height: 1.4; font-size: 13px; }}
        .container {{ max-width: 1200px; margin: 0 auto; background-color: #ffffff; padding: 15px; border: 1px solid #ddd; }}
        .header {{ text-align: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 15px; }}
        .header h1 {{ font-size: 38px; font-weight: bold; font-style: italic; letter-spacing: -1px; margin-bottom: 5px; text-transform: uppercase; }}
        .header .tagline {{ font-size: 12px; font-weight: bold; color: #000; margin-bottom: 5px; }}
        .header .timestamp {{ font-size: 12px; color: #444; font-weight: bold; text-transform: uppercase; margin-top: 5px; }}
        .main-content {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }}
        .column {{ display: flex; flex-direction: column; gap: 15px; }}
        .news-item {{ border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px; }}
        .news-item a {{ color: #0000EE; text-decoration: none; font-weight: bold; font-size: 14px; display: block; }}
        .news-item a:hover {{ text-decoration: underline; }}
        .news-item .source {{ font-size: 10px; color: #888; text-transform: uppercase; margin-top: 2px; }}
        .featured-section {{ background-color: #fff; border: 2px solid #000; padding: 15px; margin-bottom: 20px; }}
        .featured-section h2 {{ font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #000; }}
        .featured-item {{ margin-bottom: 12px; }}
        .featured-item a {{ font-size: 18px; color: #000; font-weight: 900; text-decoration: none; line-height: 1.1; }}
        .featured-item a:hover {{ background: #000; color: #fff; }}
        .section-header {{ font-size: 14px; font-weight: bold; background: #000; color: #fff; padding: 4px 8px; margin-bottom: 10px; }}
        .divider {{ border-top: 2px solid #000; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; font-size: 11px; border-top: 1px solid #ddd; }}
        @media (max-width: 768px) {{ .main-content {{ grid-template-columns: 1fr; }} }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>READY CATHOLIC</h1>
            <div class="tagline">DAILY CATHOLIC NEWS & UPDATES</div>
            <div class="timestamp">{date_string}</div>
        </div>

        <div class="featured-section">
            <h2>⚡ TOP STORIES</h2>
            {format_featured(headlines['breaking'])}
        </div>

        <div class="main-content">
            <div class="column">
                <div class="section-header">VATICAN & POPE</div>
                {format_items(headlines['vatican'])}
                
                <div class="section-header">CHURCH IN AMERICA</div>
                {format_items(headlines['america'])}
            </div>

            <div class="column">
                <div class="section-header">FAITH & SPIRITUALITY</div>
                {format_items(headlines['faith'])}
                
                <div class="section-header">CULTURE & LIFE</div>
                {format_items(headlines['culture'])}
            </div>

            <div class="column">
                <div class="section-header">WORLD CHURCH</div>
                {format_items(headlines['world'])}
                
                <div class="section-header">EDUCATION & YOUTH</div>
                {format_items(headlines['education'])}
            </div>
        </div>

        <div class="divider"></div>

        <div class="footer">
            <p><strong>READY CATHOLIC</strong></p>
            <p>Catholic news aggregator.</p>
            <p>© 2026 Ready Catholic. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
'''
    return html_template

def main():
    try:
        headlines = fetch_headlines()
        html_content = generate_html(headlines)
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(html_content)
        print("\n✓ Successfully updated ReadySetCatholic!")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == '__main__':
    main()
