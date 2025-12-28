import requests
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
import time
import random
import logging

class BaseScraper:
    def __init__(self):
        self.ua = UserAgent()
        self.session = requests.Session()
        self.logger = logging.getLogger(self.__class__.__name__)

    def get_headers(self):
        return {
            "User-Agent": self.ua.random,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Referer": "https://www.google.com/"
        }

    def fetch_page(self, url):
        try:
            time.sleep(random.uniform(1, 3))  # Politeness delay
            response = self.session.get(url, headers=self.get_headers(), timeout=10)
            response.raise_for_status()
            return response.text
        except Exception as e:
            self.logger.error(f"Error fetching {url}: {e}")
            return None

    def parse(self, html):
        return BeautifulSoup(html, 'html.parser')

    def scrape(self, query):
        raise NotImplementedError
