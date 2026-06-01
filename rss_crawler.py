import feedparser
import time

class RSSCrawler:
    def __init__(self, rss_urls):
        """
        Initialize the RSS crawler with a list of RSS feed URLs.
        """
        self.rss_urls = rss_urls
        self.cached_entries = {}  # To store already processed entries

    def fetch_feed(self, url):
        """
        Parse the RSS feed from the provided URL.
        """
        return feedparser.parse(url)

    def process_feed(self, feed):
        """
        Process the feed by iterating through its entries.
        """
        new_entries = []
        for entry in feed.entries:
            if entry.id not in self.cached_entries:
                self.cached_entries[entry.id] = entry
                new_entries.append({
                    'title': entry.title,
                    'link': entry.link,
                    'summary': entry.summary,
                    'published': entry.published
                })
        return new_entries

    def crawl(self):
        """
        Crawl through each RSS feed URL, process new data, and return it.
        """
        all_new_entries = []
        for url in self.rss_urls:
            feed = self.fetch_feed(url)
            new_entries = self.process_feed(feed)
            all_new_entries.extend(new_entries)
        return all_new_entries

if __name__ == "__main__":
    # List of RSS feed URLs
    rss_urls = [
        "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
        "https://feeds.bbci.co.uk/news/technology/rss.xml",
        "https://news.google.com/news/rss/headlines/section/topic/TECHNOLOGY"
    ]
    
    crawler = RSSCrawler(rss_urls)

    # RSS crawling in an infinite loop
    while True:
        print("Crawling RSS feeds...")
        new_data = crawler.crawl()
        if new_data:
            for entry in new_data:
                print(f"- {entry['title']} (Published: {entry['published']})")
                print(f"  Link: {entry['link']}")
                print(f"  Summary: {entry['summary']}\n")
        else:
            print("No new entries found.")

        # Sleep for 10 minutes before re-crawling
        print("Waiting for 10 minutes before the next crawl...")
        time.sleep(600)