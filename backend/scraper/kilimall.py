from scraper.base import BaseScraper
import urllib.parse
from playwright.sync_api import sync_playwright
import time
from bs4 import BeautifulSoup

class KilimallScraper(BaseScraper):
    BASE_URL = "https://www.kilimall.co.ke"
    SEARCH_URL = "https://www.kilimall.co.ke/new/commoditysearch"

    def get_headers(self):
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Referer": "https://www.google.com/"
        }
    
    def parse_price(self, price_text):
        """Parse price from text, handling formats like 'KES 1,234' or '1,234'"""
        try:
            # Remove currency symbols and common text
            cleaned = price_text.replace("KES", "").replace("KSh", "").replace(",", "").strip()
            # Extract first number found
            import re
            match = re.search(r'\d+\.?\d*', cleaned)
            if match:
                return float(match.group())
            return 0.0
        except Exception as e:
            self.logger.warning(f"Error parsing price '{price_text}': {e}")
            return 0.0

    def _fetch_with_playwright(self, url):
        self.logger.info(f"Fetching with Playwright: {url}")
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                # Add a longer timeout for the page context
                context = browser.new_context(user_agent=self.get_headers()["User-Agent"])
                context.set_default_timeout(60000)
                page = context.new_page()
                
                # Use domcontentloaded to ensure initial HTML is ready
                page.goto(url, wait_until="domcontentloaded", timeout=60000)
                
                # Wait for product items to load with a generous timeout
                try:
                    page.wait_for_selector("div.product-item", timeout=45000)
                    # Also wait for the rate element to appear, as it loads dynamically
                    try:
                        page.wait_for_selector(".rate", timeout=10000)
                    except:
                        pass
                except Exception as e:
                    self.logger.warning(f"Timeout waiting for product items selector: {e}")
                
                # Scroll down to trigger lazy loading
                try:
                    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    time.sleep(2)
                except Exception:
                    pass

                # Wait for a few seconds to allow dynamic ratings and images to load
                time.sleep(5)
                
                content = page.content()
                browser.close()
                return content
        except Exception as e:
            self.logger.error(f"Playwright fetch failed CRITICALLY: {e}")
            self.logger.error("Falling back to requests (Images will likely be missing!)")
            return None

    def scrape(self, query, max_pages=5, max_products=None):
        products = []
        # Ensure query is properly encoded if needed, though requests/playwright handle it usually.
        # But here we construct URL manually.

        for page_num in range(1, max_pages + 1):
            # Stop if we've reached the max_products limit
            if max_products and len(products) >= max_products:
                self.logger.info(f"Reached max_products limit ({max_products}). Stopping.")
                break

            url = f"{self.SEARCH_URL}?q={query}&page={page_num}"

            # Try Playwright first
            html_content = self._fetch_with_playwright(url)

            # Fallback to requests if Playwright failed
            if not html_content:
                self.logger.warning("Playwright failed, falling back to requests.")
                html_content = self.fetch_page(url)

            if not html_content:
                continue

            soup = BeautifulSoup(html_content, "html.parser")
            items = soup.select("div.product-item")

            if not items:
                self.logger.warning(f"No items found on page {page_num}")
                continue

            for item in items:
                # Check limit before adding each product
                if max_products and len(products) >= max_products:
                    self.logger.info(f"Reached max_products limit ({max_products}).")
                    break

                try:
                    title_tag = item.select_one("div.product-title")
                    if not title_tag:
                         title_tag = item.select_one("p.product-title")
                    title = title_tag.get_text(strip=True) if title_tag else "No Title"
                    
                    price_tag = item.select_one("div.product-price")
                    price_text = price_tag.get_text(strip=True) if price_tag else "0"
                    price = self.parse_price(price_text)
                    
                    link_tag = item.find_parent("a")
                    if not link_tag:
                        link_tag = item.select_one("a")
                    product_url = f"{self.BASE_URL}{link_tag['href']}" if link_tag and link_tag.get('href') else None
                    if product_url and not product_url.startswith("http"):
                         product_url = f"{self.BASE_URL}/{link_tag['href'].lstrip('/')}"
                    
                    img_tag = item.select_one("div.product-image img")
                    image_url = None
                    if img_tag:
                        image_url = img_tag.get("data-src") or img_tag.get("data-original") or img_tag.get("src") or img_tag.get("lazy")

                        if image_url and "loading" in image_url.lower():
                             self.logger.warning(f"Image URL is a placeholder ('loading') for product: {title[:30]}...")
                             if img_tag.get("src") and "loading" not in img_tag.get("src"):
                                 image_url = img_tag.get("src")
                    
                    review_count = "0"
                    rating = None
                    
                    # First, try to extract rating from .rate text (e.g., "3.5 (6)")
                    # User identified <span class="rate">3.5</span>
                    rating_tag = item.select_one(".rate")
                    if rating_tag:
                        print(f"DEBUG: Found .rate element: {rating_tag}")
                        print(f"DEBUG: .rate text: '{rating_tag.get_text(strip=True)}'")
                    else:
                        print("DEBUG: No .rate element found in item")
                        
                    rating_text_search = rating_tag.get_text(strip=True) if rating_tag else ""
                    
                    if rating_text_search:
                        # Extract all numbers
                        import re
                        numbers = re.findall(r'(\d+\.?\d*)', rating_text_search)
                        
                        # Try to find a valid rating (<= 5)
                        found_rating = False
                        if numbers:
                            # Usually the first number is the rating
                            try:
                                val = float(numbers[0])
                                if val <= 5.0:
                                    if val % 1 == 0:
                                        rating = f"{int(val)} out of 5"
                                    else:
                                        rating = f"{val} out of 5"
                                    found_rating = True
                            except:
                                pass
                        
                        # Extract review count (inside parentheses)
                        if "(" in rating_text_search and ")" in rating_text_search:
                            try:
                                count_str = rating_text_search.split("(")[1].split(")")[0]
                                review_count = count_str
                            except:
                                pass
                    
                    # Fallback: count filled stars if no valid rating text found
                    if not rating:
                        filled_stars = item.select('div.van-rate__item[aria-checked="true"]')
                        if filled_stars:
                            rating_value = len(filled_stars)
                            rating = f"{rating_value} out of 5"
                    
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
                    self.logger.error(f"Error parsing item: {e}")
                    continue
                    
        return products
