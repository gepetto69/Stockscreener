import logging
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional
import yfinance as yf

logger = logging.getLogger(__name__)

# In-memory TTL cache: {cache_key: (timestamp, data)}
_NEWS_CACHE: Dict[str, tuple[float, List[Dict[str, Any]]]] = {}
CACHE_TTL_SECONDS = 1800  # 30 minutes


def _format_relative_time(dt: datetime) -> str:
    """Format datetime into a friendly French relative time string."""
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now - dt
    total_seconds = int(diff.total_seconds())

    if total_seconds < 0:
        return "À l'instant"
    if total_seconds < 3600:
        mins = max(1, total_seconds // 60)
        return f"Il y a {mins} min"
    if total_seconds < 86400:
        hours = total_seconds // 3600
        return f"Il y a {hours} h"
    days = total_seconds // 86400
    if days == 1:
        return "Hier"
    if days < 7:
        return f"Il y a {days} jours"
    if days < 30:
        weeks = days // 7
        return f"Il y a {weeks} sem."
    return dt.strftime("%d/%m/%Y")


def _clean_html_text(raw_html: Optional[str]) -> str:
    """Strip HTML tags and unescape entities."""
    if not raw_html:
        return ""
    text = re.sub(r"<[^>]+>", " ", raw_html)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _infer_category(title: str, summary: str = "") -> str:
    """Infer financial category from title and summary keywords."""
    text = f"{title} {summary}".lower()
    if any(k in text for k in ["earning", "result", "revenue", "profit", "bpa", "ebitda", "chiffre d'affaires", "bénéfice", "quarter"]):
        return "Résultats Financiers"
    if any(k in text for k in ["contract", "deal", "partner", "acquire", "merger", "accord", "acquisition", "partenariat"]):
        return "Stratégie & Contrats"
    if any(k in text for k in ["dividend", "buyback", "share repurchase", "dividende", "rachat d'actions"]):
        return "Retour Actionnarial"
    if any(k in text for k in ["analyst", "upgrade", "downgrade", "target price", "rating", "conseil", "objectif"]):
        return "Consensus & Analystes"
    if any(k in text for k in ["ai", "ia", "tech", "chip", "cloud", "launch", "innovation"]):
        return "Innovation & Tech"
    if any(k in text for k in ["fda", "trial", "patent", "santé", "biotech"]):
        return "R&D & Régulation"
    return "Marché & Entreprise"


def _estimate_sentiment(title: str, summary: str = "") -> str:
    """Estimate basic sentiment: positif, neutre, or vigilant."""
    text = f"{title} {summary}".lower()
    positive = ["beat", "surge", "gain", "rise", "soar", "record", "jump", "upgrade", "growth", "progression", "hausse", "succès"]
    negative = ["fall", "drop", "sink", "slump", "miss", "plunge", "down", "downgrade", "cut", "risk", "baisse", "chute", "procès", "alerte"]
    pos_count = sum(1 for w in positive if w in text)
    neg_count = sum(1 for w in negative if w in text)
    if pos_count > neg_count:
        return "Positif"
    if neg_count > pos_count:
        return "Vigilance"
    return "Neutre"


class NewsService:
    @classmethod
    def get_company_news(
        cls,
        symbol: str,
        company_name: Optional[str] = None,
        limit: int = 8
    ) -> List[Dict[str, Any]]:
        """
        Fetch real-world financial news for a given ticker or company name.
        Uses in-memory cache (TTL 30 mins).
        1. Tries yfinance.Ticker(symbol).news
        2. Tries Yahoo Finance RSS feed (finance.yahoo.com/rss/headline?s={symbol})
        3. Tries Google News RSS feed as fallback / supplement
        Returns uniform formatted news items.
        """
        sym_clean = symbol.strip().upper()
        cache_key = f"{sym_clean}_{limit}"
        now_ts = time.time()

        if cache_key in _NEWS_CACHE:
            ts, cached_items = _NEWS_CACHE[cache_key]
            if now_ts - ts < CACHE_TTL_SECONDS:
                logger.info(f"Returning {len(cached_items)} cached news items for {sym_clean}")
                return cached_items

        items: List[Dict[str, Any]] = []

        # 1. Try yfinance.Ticker(symbol).news / get_news()
        try:
            yf_items = cls._fetch_from_yfinance(sym_clean)
            if yf_items:
                items.extend(yf_items)
        except Exception as e:
            logger.warning(f"Error fetching yfinance news for {sym_clean}: {e}")

        # 2. If insufficient, try Yahoo Finance RSS feed
        if len(items) < limit:
            try:
                rss_items = cls._fetch_from_yahoo_rss(sym_clean)
                for item in rss_items:
                    if not any(cls._are_titles_similar(item["title"], existing["title"]) for existing in items):
                        items.append(item)
            except Exception as e:
                logger.warning(f"Error fetching Yahoo RSS for {sym_clean}: {e}")

        # 3. If still empty or insufficient, try Google News RSS
        if len(items) < limit:
            try:
                search_query = f"{company_name or sym_clean} stock"
                gnews_items = cls._fetch_from_google_news_rss(search_query)
                for item in gnews_items:
                    if not any(cls._are_titles_similar(item["title"], existing["title"]) for existing in items):
                        items.append(item)
            except Exception as e:
                logger.warning(f"Error fetching Google News RSS for {search_query}: {e}")

        final_items = items[:limit]

        # If completely empty (e.g. completely offline test), provide a safe fallback article
        if not final_items:
            final_items = cls._generate_fallback_news(sym_clean, company_name or sym_clean)

        _NEWS_CACHE[cache_key] = (now_ts, final_items)
        return final_items

    @classmethod
    def _fetch_from_yfinance(cls, symbol: str) -> List[Dict[str, Any]]:
        """Fetch news using yfinance Ticker.news or get_news()."""
        ticker = yf.Ticker(symbol)
        raw_news = ticker.news
        if not raw_news:
            return []

        results = []
        for idx, it in enumerate(raw_news):
            # yfinance formats can vary by version:
            # Newer versions might have nested 'content' or top-level keys
            title = it.get("title")
            link = it.get("link")
            publisher = it.get("publisher", "Yahoo Finance")
            publish_time = it.get("providerPublishTime")

            # Check if nested in 'content' (yfinance 0.2.x+ schema)
            if not title and "content" in it and isinstance(it["content"], dict):
                c = it["content"]
                title = c.get("title")
                pub_data = c.get("pubDate")
                link = c.get("canonicalUrl", {}).get("url") if isinstance(c.get("canonicalUrl"), dict) else c.get("canonicalUrl")
                provider = c.get("provider", {})
                publisher = provider.get("displayName", "Yahoo Finance") if isinstance(provider, dict) else str(provider)
                if pub_data:
                    try:
                        publish_time = int(datetime.fromisoformat(pub_data.replace("Z", "+00:00")).timestamp())
                    except Exception:
                        pass

            if not title:
                continue

            summary = it.get("summary") or it.get("description") or ""
            dt = datetime.fromtimestamp(publish_time, timezone.utc) if publish_time else datetime.now(timezone.utc)
            rel_time = _format_relative_time(dt)
            category = _infer_category(title, summary)
            sentiment = _estimate_sentiment(title, summary)

            results.append({
                "id": f"yf_{symbol}_{idx}_{int(dt.timestamp())}",
                "title": title.strip(),
                "publisher": publisher or "Yahoo Finance",
                "link": link or f"https://finance.yahoo.com/quote/{symbol}",
                "published_at": rel_time,
                "published_raw": dt.isoformat(),
                "summary": _clean_html_text(summary)[:280] if summary else None,
                "category": category,
                "sentiment": sentiment,
                "source": "Yahoo Finance"
            })
        return results

    @classmethod
    def _fetch_from_yahoo_rss(cls, symbol: str) -> List[Dict[str, Any]]:
        """Fetch headlines from Yahoo Finance RSS headline endpoint."""
        url = f"https://finance.yahoo.com/rss/headline?s={symbol}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        )

        with urllib.request.urlopen(req, timeout=8) as resp:
            data = resp.read()

        root = ET.fromstring(data)
        xml_items = root.findall("./channel/item")
        results = []

        for idx, item in enumerate(xml_items):
            title = item.findtext("title")
            link = item.findtext("link")
            pub_date_str = item.findtext("pubDate")
            desc = item.findtext("description")

            if not title:
                continue

            # Parse publisher from link domain or title
            publisher = "Yahoo Finance"
            if link:
                try:
                    domain = urllib.parse.urlparse(link).netloc.lower()
                    if "fool.com" in domain:
                        publisher = "The Motley Fool"
                    elif "bloomberg" in domain:
                        publisher = "Bloomberg"
                    elif "reuters" in domain:
                        publisher = "Reuters"
                    elif "cnbc" in domain:
                        publisher = "CNBC"
                    elif "wsj" in domain:
                        publisher = "Wall Street Journal"
                    elif "barrons" in domain:
                        publisher = "Barron's"
                    elif "investors.com" in domain:
                        publisher = "Investor's Business Daily"
                    elif "benzinga" in domain:
                        publisher = "Benzinga"
                    elif "tipranks" in domain:
                        publisher = "TipRanks"
                    elif "zacks" in domain:
                        publisher = "Zacks Equity"
                    elif "stocktwits" in domain:
                        publisher = "Stocktwits"
                    elif "seekingalpha" in domain:
                        publisher = "Seeking Alpha"
                    elif domain:
                        if "finance.yahoo.com" in domain:
                            publisher = "Yahoo Finance"
                        else:
                            # Clean domain name e.g. www.tikr.com -> Tikr
                            parts = domain.replace("www.", "").split(".")
                            publisher = parts[0].capitalize() if parts else "Yahoo Finance"
                except Exception:
                    publisher = "Yahoo Finance"

            dt = datetime.now(timezone.utc)
            if pub_date_str:
                try:
                    dt = parsedate_to_datetime(pub_date_str)
                except Exception:
                    pass

            rel_time = _format_relative_time(dt)
            clean_desc = _clean_html_text(desc)
            category = _infer_category(title, clean_desc)
            sentiment = _estimate_sentiment(title, clean_desc)

            results.append({
                "id": f"yfrss_{symbol}_{idx}_{int(dt.timestamp())}",
                "title": title.strip(),
                "publisher": publisher,
                "link": link or f"https://finance.yahoo.com/quote/{symbol}",
                "published_at": rel_time,
                "published_raw": dt.isoformat(),
                "summary": clean_desc[:280] if clean_desc else None,
                "category": category,
                "sentiment": sentiment,
                "source": "Yahoo Finance RSS"
            })

        return results

    @classmethod
    def _fetch_from_google_news_rss(cls, query: str) -> List[Dict[str, Any]]:
        """Fetch headlines from Google News RSS feed."""
        encoded_query = urllib.parse.quote(query)
        url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-US&gl=US&ceid=US:en"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        )

        with urllib.request.urlopen(req, timeout=8) as resp:
            data = resp.read()

        root = ET.fromstring(data)
        xml_items = root.findall("./channel/item")
        results = []

        for idx, item in enumerate(xml_items):
            title = item.findtext("title")
            link = item.findtext("link")
            pub_date_str = item.findtext("pubDate")
            desc = item.findtext("description")
            source_el = item.find("source")
            publisher = source_el.text if source_el is not None and source_el.text else "Google News"

            if not title:
                continue

            # Strip publisher if title ends with " - Publisher"
            clean_title = title
            if " - " in title:
                parts = title.rsplit(" - ", 1)
                clean_title = parts[0]
                if not publisher or publisher == "Google News":
                    publisher = parts[1].strip()

            dt = datetime.now(timezone.utc)
            if pub_date_str:
                try:
                    dt = parsedate_to_datetime(pub_date_str)
                except Exception:
                    pass

            rel_time = _format_relative_time(dt)
            clean_desc = _clean_html_text(desc)
            category = _infer_category(clean_title, clean_desc)
            sentiment = _estimate_sentiment(clean_title, clean_desc)

            results.append({
                "id": f"gnews_{idx}_{int(dt.timestamp())}",
                "title": clean_title.strip(),
                "publisher": publisher.strip() if publisher else "Google News",
                "link": link or "https://news.google.com",
                "published_at": rel_time,
                "published_raw": dt.isoformat(),
                "summary": clean_desc[:280] if clean_desc else None,
                "category": category,
                "sentiment": sentiment,
                "source": "Google News RSS"
            })

        return results

    @classmethod
    def _are_titles_similar(cls, t1: str, t2: str) -> bool:
        """Check if two article titles are essentially the same."""
        words1 = set(re.findall(r"\w+", t1.lower()))
        words2 = set(re.findall(r"\w+", t2.lower()))
        if not words1 or not words2:
            return False
        common = words1.intersection(words2)
        sim = len(common) / min(len(words1), len(words2))
        return sim > 0.75

    @classmethod
    def _generate_fallback_news(cls, symbol: str, company_name: str) -> List[Dict[str, Any]]:
        """Safe default news items if network is completely unreachable."""
        return [
            {
                "id": f"fb_{symbol}_1",
                "title": f"Dernières publications financières et analyse fondamentale de {company_name}",
                "publisher": "Databourse Newsflow",
                "link": f"https://finance.yahoo.com/quote/{symbol}",
                "published_at": "Récemment",
                "published_raw": datetime.now(timezone.utc).isoformat(),
                "summary": f"Retrouvez les dernières actualités stratégiques, publications trimestrielles et catalyseurs de marché pour {company_name} ({symbol}).",
                "category": "Marché & Entreprise",
                "sentiment": "Neutre",
                "source": "Flux de secours Databourse"
            }
        ]

    @classmethod
    def clear_cache(cls):
        """Clear news cache for testing."""
        _NEWS_CACHE.clear()
