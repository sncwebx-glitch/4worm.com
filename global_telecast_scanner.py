import requests
import feedparser
import time

class GlobalTelecastScanner:
    def __init__(self, rss_feeds, keywords, output_file):
        """
        Initialize the scanner with RSS feed URLs, keywords, and output file.

        :param rss_feeds: List of RSS feed URLs to monitor.
        :param keywords: List of keywords to search for.
        :param output_file: File to save the tagged matches.
        """
        self.rss_feeds = rss_feeds
        self.keywords = [word.lower() for word in keywords]
        self.output_file = output_file

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
        self.save_results(all_matches)

    def save_results(self, matches):
        """
        Save matches to the output file.

        :param matches: List of matches found in the global telecasts.
        """
        with open(self.output_file, 'w') as file:
            for match in matches:
                file.write(f"Title: {match['title']}\n")
                file.write(f"Link: {match['link']}\n")
                file.write(f"Summary: {match['summary']}\n")
                file.write(f"Matched Keyword: {match['keyword']}\n")
                file.write(f"Published: {match['published']}\n")
                file.write("=" * 60 + "\n")
        print(f"Results saved to {self.output_file}!")

if __name__ == "__main__":
    # Define RSS feeds to scan
    rss_feeds = [
        "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
        "https://feeds.bbci.co.uk/news/rss.xml",
        "https://news.google.com/news/rss/headlines/section/topic/WORLD/rss.xml"
    ]

    # Define keywords to search for
    keywords = ["breaking", "urgent", "alert", "exclusive"]

    # Output file to save the matches
    output_file = "global_telecast_matches.txt"

    # Execute the global telecast scanner
    scanner = GlobalTelecastScanner(rss_feeds, keywords, output_file)

    while True:
        print("Scanning global telecasts...")
        scanner.scan_global_telecasts()
        print("Waiting for 15 minutes before the next scan...")
        time.sleep(900)  # Wait for 15 minutes before performing the next scan