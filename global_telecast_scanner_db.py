import feedparser
import sqlite3
import time


class GlobalTelecastScanner:
    def __init__(self, rss_feeds, keywords, db_file):
        """
        Initialize the scanner with RSS feed URLs, keywords, and database file.

        :param rss_feeds: List of RSS feed URLs to monitor.
        :param keywords: List of keywords to search for.
        :param db_file: Path to the SQLite database file.
        """
        self.rss_feeds = rss_feeds
        self.keywords = [word.lower() for word in keywords]
        self.db_file = db_file
        self.initialize_database()

    def initialize_database(self):
        """
        Initialize the SQLite database to store matches.
        """
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY,
            title TEXT,
            link TEXT,
            summary TEXT,
            keyword TEXT,
            published TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)
        conn.commit()
        conn.close()

    def fetch_rss_feed(self, url):
        """
        Fetch and parse an RSS feed from the URL.

        :param url: RSS feed URL.
        :return: Parsed RSS feed.
        """
        return feedparser.parse(url)

    def process_feed(self, feed):
        """
        Process the RSS feed for entries that match the keywords.

        :param feed: Parsed RSS feed.
        :return: List of tagged entries.
        """
        matches = []
        for entry in feed.entries:
            for keyword in self.keywords:
                if keyword in entry.title.lower() or keyword in entry.get('summary', '').lower():
                    matches.append({
                        'title': entry.title,
                        'link': entry.link,
                        'summary': entry.get('summary', 'No summary available.'),
                        'keyword': keyword,
                        'published': entry.get('published', 'N/A')
                    })
        return matches

    def save_to_database(self, matches):
        """
        Save matches to the database.

        :param matches: List of matches found in the global telecasts.
        """
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        for match in matches:
            cursor.execute("""
            INSERT INTO matches (title, link, summary, keyword, published)
            VALUES (?, ?, ?, ?, ?)
            """, (match['title'], match['link'], match['summary'], match['keyword'], match['published']))
        conn.commit()
        conn.close()
        print("Matches saved to the database!")

    def scan_global_telecasts(self):
        """
        Scan all RSS feeds for new content matching the keywords.
        """
        all_matches = []
        for feed_url in self.rss_feeds:
            print(f"Scanning feed: {feed_url}")
            feed = self.fetch_rss_feed(feed_url)
            matches = self.process_feed(feed)
            all_matches.extend(matches)
        self.save_to_database(all_matches)


if __name__ == "__main__":
    # Define RSS feeds to scan
    rss_feeds = [
        "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
        "https://feeds.bbci.co.uk/news/rss.xml",
        "https://news.google.com/news/rss/headlines/section/topic/WORLD/rss.xml"
    ]

    # Define keywords to search for
    keywords = ["breaking", "urgent", "alert", "exclusive"]

    # SQLite database file
    db_file = "telecast_scanner.db"

    # Execute the global telecast scanner
    scanner = GlobalTelecastScanner(rss_feeds, keywords, db_file)

    while True:
        print("Scanning global telecasts...")
        scanner.scan_global_telecasts()
        print("Waiting for 15 minutes before the next scan...")
        time.sleep(900)  # Wait for 15 minutes before performing the next scan