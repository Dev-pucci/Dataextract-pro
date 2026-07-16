import re
import time
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from scraper.base import BaseScraper, DEFAULT_MAX_PRODUCTS


class KilimallScraper(BaseScraper):
    BASE_URL = "https://www.kilimall.co.ke"
    SEARCH_URL = "https://www.kilimall.co.ke/new/commoditysearch"

    def get_headers(self):
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Referer": "https://www.google.com/"
        }

    def parse_price(self, price_text):
        try:
            cleaned = price_text.replace("KES", "").replace("KSh", "").replace(",", "").strip()
            match = re.search(r'\d+\.?\d*', cleaned)
            return float(match.group()) if match else 0.0
        except Exception as e:
            self.logger.warning(f"Error parsing price '{price_text}': {e}")
            return 0.0

    def _scrape_page_with_playwright(self, url):
        """
        Uses Playwright to load the page, scroll to trigger lazy loading,
        then extracts all product data directly from the live DOM via JS evaluate.
        Returns a list of raw product dicts with image URLs resolved by the browser.
        """
        self.logger.info(f"Fetching with Playwright: {url}")
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent=self.get_headers()["User-Agent"],
                    viewport={"width": 1280, "height": 900}
                )
                context.set_default_timeout(60000)
                page = context.new_page()

                page.goto(url, wait_until="domcontentloaded", timeout=60000)

                # Wait for products to appear
                try:
                    page.wait_for_selector("div.product-item", timeout=45000)
                except Exception as e:
                    self.logger.warning(f"Timeout waiting for product items: {e}")
                    browser.close()
                    return None

                # Scroll incrementally so Vue lazy-load fires for every item
                total_height = page.evaluate("document.body.scrollHeight")
                step = 300
                pos = 0
                while pos < total_height:
                    page.evaluate(f"window.scrollTo(0, {pos})")
                    time.sleep(0.15)
                    pos += step

                # Final pause to let last images settle
                time.sleep(3)

                # Extract product data directly from the live browser DOM.
                # img.currentSrc gives the browser's actually-loaded URL,
                # bypassing all lazy-load attribute variations.
                raw_products = page.evaluate("""
                    () => {
                        const PLACEHOLDER_PATTERNS = ['loading', 'placeholder', 'blank', 'data:image', 'spinner'];

                        function isPlaceholder(url) {
                            if (!url) return true;
                            const lower = url.toLowerCase();
                            return PLACEHOLDER_PATTERNS.some(p => lower.includes(p));
                        }

                        function resolveImage(img) {
                            if (!img) return null;

                            // currentSrc is what the browser actually loaded
                            let src = img.currentSrc;
                            if (src && !isPlaceholder(src)) return src;

                            // Walk through common lazy-load attributes
                            const attrs = ['data-src', 'data-lazy-src', 'lazy-src', 'data-original', 'data-lazy', 'src'];
                            for (const attr of attrs) {
                                src = img.getAttribute(attr);
                                if (src && !isPlaceholder(src)) {
                                    if (src.startsWith('//')) src = 'https:' + src;
                                    return src;
                                }
                            }
                            return null;
                        }

                        function resolveRating(item) {
                            // Vant UI: filled star = i.van-icon-star (without van-icon-star-o)
                            const filled = item.querySelectorAll('i.van-icon-star:not(.van-icon-star-o)');
                            if (filled.length > 0 && filled.length <= 5) return filled.length;

                            // Vant: aria-checked or full class variants
                            const checkedStars = item.querySelectorAll(
                                ".van-rate__item [aria-checked='true'], .van-rate__item--full"
                            );
                            if (checkedStars.length > 0 && checkedStars.length <= 5) return checkedStars.length;

                            return null;
                        }

                        function resolveReviews(item) {
                            // Review count sits beside the rating as "(1280)"
                            const el = item.querySelector('span.reviews');
                            if (!el) return null;
                            const digits = el.textContent.replace(/[^0-9]/g, '');
                            return digits || null;
                        }

                        return Array.from(document.querySelectorAll('div.product-item')).map(item => {
                            const titleEl = item.querySelector('.product-title');
                            const priceEl = item.querySelector('.product-price');
                            const img     = item.querySelector('img');
                            const link    = item.closest('a') || item.querySelector('a');

                            return {
                                title:       titleEl ? titleEl.textContent.trim() : '',
                                priceText:   priceEl ? priceEl.textContent.trim() : '0',
                                imageUrl:    resolveImage(img),
                                rating:      resolveRating(item),
                                reviewCount: resolveReviews(item),
                                url:         link ? link.href : null
                            };
                        });
                    }
                """)

                browser.close()
                return raw_products

        except Exception as e:
            self.logger.error(f"Playwright fetch failed: {e}")
            return None

    def scrape(self, query, max_pages=5, max_products=DEFAULT_MAX_PRODUCTS):
        products = []

        for page_num in range(1, max_pages + 1):
            if max_products and len(products) >= max_products:
                self.logger.info(f"Reached max_products limit ({max_products}). Stopping.")
                break

            url = f"{self.SEARCH_URL}?q={query}&page={page_num}"
            raw_products = self._scrape_page_with_playwright(url)

            if not raw_products:
                self.logger.warning(f"No products returned from Playwright for page {page_num}. Stopping.")
                break

            for raw in raw_products:
                if max_products and len(products) >= max_products:
                    break

                try:
                    title = raw.get("title") or "No Title"
                    price = self.parse_price(raw.get("priceText", "0"))
                    image_url = raw.get("imageUrl")
                    product_url = raw.get("url")
                    rating_val = raw.get("rating")
                    rating = f"{rating_val} out of 5" if rating_val else None
                    review_count = raw.get("reviewCount") or "0"

                    products.append({
                        "title": title,
                        "price": price,
                        "currency": "KES",
                        "url": product_url,
                        "image_url": image_url,
                        "rating": rating,
                        "review_count": review_count
                    })
                except Exception as e:
                    self.logger.error(f"Error processing product: {e}")
                    continue

        return products
