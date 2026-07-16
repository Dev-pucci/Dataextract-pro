from scraper.base import BaseScraper, DEFAULT_MAX_PRODUCTS
import urllib.parse

class JumiaScraper(BaseScraper):
    BASE_URL = "https://www.jumia.co.ke"

    def get_headers(self):
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Referer": "https://www.google.com/"
        }

    def scrape(self, query, max_pages=5, max_products=DEFAULT_MAX_PRODUCTS):
        products = []
        encoded_query = urllib.parse.quote(query)

        for page in range(1, max_pages + 1):
            # Stop if we've reached the max_products limit
            if max_products and len(products) >= max_products:
                self.logger.info(f"Reached max_products limit ({max_products}). Stopping.")
                break

            url = f"{self.BASE_URL}/catalog/?q={encoded_query}&page={page}"
            self.logger.info(f"Scraping Jumia: {url}")

            html = self.fetch_page(url)
            if not html:
                break

            soup = self.parse(html)
            items = soup.select("article.prd._fb.col.c-prd")

            if not items:
                self.logger.info("No items found or end of results.")
                break

            for item in items:
                # Check limit before adding each product
                if max_products and len(products) >= max_products:
                    self.logger.info(f"Reached max_products limit ({max_products}).")
                    break

                try:
                    title_tag = item.select_one("h3.name")
                    price_tag = item.select_one("div.prc")
                    img_tag = item.select_one("img.img")
                    link_tag = item.select_one("a.core")
                    rating_tag = item.select_one("div.stars._s")

                    title = title_tag.get_text(strip=True) if title_tag else "N/A"
                    price_str = price_tag.get_text(strip=True) if price_tag else "0"
                    price = float(price_str.replace("KSh", "").replace(",", "").strip()) if price_str != "0" else 0.0

                    image_url = img_tag.get("data-src") or img_tag.get("src") if img_tag else None
                    product_url = f"{self.BASE_URL}{link_tag.get('href')}" if link_tag else None

                    rating = rating_tag.get_text(strip=True) if rating_tag else None

                    review_count = None
                    rev_tag = item.select_one("div.rev")
                    if rev_tag:
                        rev_text = rev_tag.get_text(strip=True)
                        if "(" in rev_text and ")" in rev_text:
                            try:
                                review_count = rev_text.split("(")[1].split(")")[0]
                            except:
                                pass

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
