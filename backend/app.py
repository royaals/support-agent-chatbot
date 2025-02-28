import os
import time
import logging
from typing import List, Dict, Optional, Any
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
from elasticsearch import Elasticsearch
from dotenv import load_dotenv


logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


load_dotenv()

app = Flask(__name__)
CORS(app)


es = Elasticsearch(
    os.getenv("ELASTICSEARCH_URL"), api_key=os.getenv("ELASTICSEARCH_API_KEY")
)


class DocumentProcessor:
    @staticmethod
    def clean_text(text: str) -> str:
        """Clean and normalize text content."""
        if not text:
            return ""

        text = " ".join(text.split())

        text = text.replace("\n", " ").replace("\r", " ")
        return text

    @staticmethod
    def extract_steps(content: str) -> List[str]:
        """Extract steps from content if it's a how-to guide."""
        steps = []
        lines = content.split("\n")
        for line in lines:
            line = line.strip()
            if line.lower().startswith(("step ", "1.", "2.", "3.")) and len(line) > 5:
                steps.append(line)
        return steps


class DocumentScraper:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        self.timeout = int(os.getenv("REQUEST_TIMEOUT", "30"))
        self.delay = int(os.getenv("SCRAPE_DELAY", "1"))
        self.max_retries = int(os.getenv("MAX_RETRIES", "3"))
        self.processor = DocumentProcessor()

    def get_page_content(self, url: str) -> Optional[str]:
        """Fetch page content with retry logic."""
        for attempt in range(self.max_retries):
            try:
                response = requests.get(url, headers=self.headers, timeout=self.timeout)
                response.raise_for_status()
                return response.content
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed for {url}: {e}")
                if attempt + 1 < self.max_retries:
                    time.sleep(self.delay)
        return None

    def extract_content(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """Extract and structure content from page."""

        title = None
        for title_elem in [
            soup.find("h1"),
            soup.find("title"),
            soup.find(class_="page-title"),
        ]:
            if title_elem:
                title = title_elem.get_text().strip()
                break

        main_content = None
        for content_elem in [
            soup.find("main"),
            soup.find("article"),
            soup.find(class_="content"),
            soup.find(id="content"),
            soup.find(class_="documentation"),
            soup,
        ]:
            if content_elem:
                main_content = content_elem
                break

        content = []
        if main_content:

            headers = []
            for header in main_content.find_all(["h1", "h2", "h3"]):
                headers.append(header.get_text().strip())

            for elem in main_content.find_all(["p", "li", "code"]):
                text = elem.get_text().strip()
                if text:
                    content.append(text)

        full_content = " ".join(content)
        clean_content = self.processor.clean_text(full_content)

        steps = self.processor.extract_steps(clean_content)

        return {
            "url": url,
            "title": title or "Untitled Document",
            "content": clean_content,
            "headers": headers if headers else [],
            "steps": steps if steps else [],
            "type": "guide" if steps else "documentation",
        }

    def scrape_docs(self, base_url: str) -> List[Dict[str, Any]]:
        """Main scraping function with improved content extraction."""
        logger.info(f"Starting scrape of {base_url}")
        docs = []
        processed_urls = set()

        try:

            content = self.get_page_content(base_url)
            if not content:
                return docs

            soup = BeautifulSoup(content, "html.parser")

            doc_links = set()
            for element in soup.select(
                "nav a, .docs a, .documentation a, sidebar a, main a"
            ):
                href = element.get("href")
                if href and not href.startswith(
                    ("#", "javascript:", "mailto:", "tel:")
                ):
                    if not href.startswith("http"):
                        href = base_url.rstrip("/") + "/" + href.lstrip("/")
                    if href.startswith(base_url):
                        doc_links.add(href)

            for href in doc_links:
                if href in processed_urls:
                    continue

                processed_urls.add(href)

                try:
                    page_content = self.get_page_content(href)
                    if page_content:
                        page_soup = BeautifulSoup(page_content, "html.parser")
                        doc_content = self.extract_content(page_soup, href)

                        if doc_content["content"]:
                            docs.append(doc_content)
                            logger.info(f"Successfully scraped {href}")

                    time.sleep(self.delay)

                except Exception as e:
                    logger.error(f"Failed to scrape {href}: {e}")

            logger.info(f"Found {len(docs)} documents for {base_url}")
            return docs

        except Exception as e:
            logger.error(f"Error scraping documentation from {base_url}: {e}")
            return []


class ElasticsearchManager:
    def __init__(self, es_client):
        self.es = es_client
        self.index_settings = {
            "settings": {
                "analysis": {
                    "analyzer": {
                        "custom_analyzer": {
                            "type": "custom",
                            "tokenizer": "standard",
                            "filter": ["lowercase", "stop", "snowball"],
                        }
                    }
                }
            },
            "mappings": {
                "properties": {
                    "title": {"type": "text", "analyzer": "custom_analyzer"},
                    "content": {"type": "text", "analyzer": "custom_analyzer"},
                    "headers": {"type": "text", "analyzer": "custom_analyzer"},
                    "steps": {"type": "text", "analyzer": "custom_analyzer"},
                    "type": {"type": "keyword"},
                    "url": {"type": "keyword"},
                }
            },
        }

    def setup_index(self, index_name: str):
        """Create or recreate index with settings."""
        try:

            if self.es.indices.exists(index=index_name):
                self.es.indices.delete(index=index_name)
                logger.info(f"Deleted existing index: {index_name}")

            self.es.indices.create(index=index_name, body=self.index_settings)
            logger.info(f"Created index: {index_name}")
        except Exception as e:
            logger.error(f"Error setting up index {index_name}: {e}")
            raise

    def index_documents(self, index_name: str, documents: List[Dict[str, Any]]):
        """Index multiple documents."""
        try:
            for i, doc in enumerate(documents):
                self.es.index(index=index_name, id=i, document=doc)
            logger.info(f"Indexed {len(documents)} documents in {index_name}")
        except Exception as e:
            logger.error(f"Error indexing documents: {e}")
            raise

    def search_documents(self, index_name: str, query: str) -> Dict[str, Any]:
        """Enhanced search with better relevance scoring and context."""
        try:

            query_terms = query.lower().split()
            is_how_to = any(
                term in query.lower() for term in ["how", "how to", "how do i"]
            )
            is_integration = any(
                term in query.lower()
                for term in ["integrate", "integration", "connect", "setup"]
            )
            is_audience = any(
                term in query.lower()
                for term in ["audience", "segment", "segmentation"]
            )

            search_query = {
                "query": {
                    "bool": {
                        "must": [
                            {
                                "multi_match": {
                                    "query": query,
                                    "fields": ["title^3", "content^2", "headers"],
                                    "type": "most_fields",
                                    "fuzziness": "AUTO",
                                    "minimum_should_match": "70%",
                                }
                            }
                        ],
                        "should": [
                            {
                                "match_phrase": {
                                    "content": {"query": query, "boost": 2, "slop": 2}
                                }
                            }
                        ],
                    }
                },
                "highlight": {
                    "pre_tags": ["<strong>"],
                    "post_tags": ["</strong>"],
                    "fields": {
                        "content": {
                            "number_of_fragments": 3,
                            "fragment_size": 150,
                            "order": "score",
                        },
                        "title": {"number_of_fragments": 0},
                    },
                },
            }

            if is_how_to:
                search_query["query"]["bool"]["should"].append(
                    {"match": {"type": {"query": "guide", "boost": 2}}}
                )

            if is_integration:
                search_query["query"]["bool"]["should"].append(
                    {
                        "match": {
                            "content": {
                                "query": "integration setup configure api connection",
                                "boost": 1.5,
                            }
                        }
                    }
                )

            if is_audience:
                search_query["query"]["bool"]["should"].append(
                    {
                        "match": {
                            "content": {
                                "query": "audience segment segmentation targeting rules",
                                "boost": 1.5,
                            }
                        }
                    }
                )

            response = self.es.search(index=index_name, body=search_query)
            return response
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            raise


scraper = DocumentScraper()
es_manager = ElasticsearchManager(es)


def format_search_response(hit: Dict[str, Any], query: str) -> Dict[str, Any]:
    """Format search result with enhanced content and suggestions."""
    source = hit["_source"]
    highlights = hit.get("highlight", {})

    content_preview = (
        " ... ".join(highlights.get("content", []))
        if "content" in highlights
        else source["content"][:300]
    )

    is_how_to = any(term in query.lower() for term in ["how", "how to", "how do i"])
    response_type = (
        "guide" if is_how_to or source.get("type") == "guide" else "documentation"
    )
    relevance = "High" if hit["_score"] > 1.0 else "Medium"

    suggestions = []
    if response_type == "guide":
        suggestions = [
            "View step-by-step guide",
            "See related examples",
            "Check prerequisites",
        ]
    else:
        suggestions = [
            "Read full documentation",
            "View related topics",
            "Check API reference",
        ]

    steps = source.get("steps", [])
    if steps and is_how_to:
        formatted_steps = [f"{i+1}. {step}" for i, step in enumerate(steps)]
    else:
        formatted_steps = []

    return {
        "title": source.get("title", "Relevant Documentation"),
        "snippet": {"text": content_preview, "type": response_type},
        "steps": formatted_steps,
        "link": source["url"],
        "score": hit["_score"],
        "metadata": {
            "relevance": relevance,
            "documentType": response_type.capitalize(),
            "headers": source.get("headers", [])[:3],
        },
        "suggestions": suggestions,
    }


def get_alternative_suggestions(cdp: str) -> List[str]:
    """Get alternative search suggestions based on CDP."""
    suggestions = {
        "segment": [
            "How to set up Segment tracking",
            "Creating a new source in Segment",
            "Segment data integration guide",
        ],
        "mparticle": [
            "Setting up mParticle SDK",
            "Creating user profiles in mParticle",
            "mParticle data mapping guide",
        ],
        "lytics": [
            "Building audiences in Lytics",
            "Lytics campaign setup guide",
            "Lytics data collection setup",
        ],
        "zeotap": [
            "Zeotap data integration guide",
            "Setting up identity resolution",
            "Creating segments in Zeotap",
        ],
    }
    return suggestions.get(cdp, [])


@app.route("/health", methods=["GET"])
def health_check():
    """Enhanced health check endpoint with detailed status."""
    try:
        indices = ["segment_docs", "mparticle_docs", "lytics_docs", "zeotap_docs"]
        status = {
            "elasticsearch": {
                "connected": es.ping(),
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            },
            "indices": {},
        }

        for index in indices:
            if es.indices.exists(index=index):
                count = es.count(index=index)
                status["indices"][index] = {
                    "exists": True,
                    "document_count": count["count"],
                    "last_updated": time.strftime("%Y-%m-%d %H:%M:%S"),
                }
            else:
                status["indices"][index] = {"exists": False, "document_count": 0}

        return jsonify(status)
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({"error": "Health check failed", "message": str(e)}), 500


@app.route("/initialize/<cdp>", methods=["POST"])
def initialize_single_index(cdp: str):
    """Initialize or update documentation for a single CDP."""
    try:
        docs_urls = {
            "segment": "https://segment.com/docs/",
            "mparticle": "https://docs.mparticle.com",
            "lytics": "https://docs.lytics.com",
            "zeotap": "https://docs.zeotap.com",
        }

        if cdp not in docs_urls:
            return (
                jsonify(
                    {
                        "error": "Invalid CDP specified",
                        "valid_options": list(docs_urls.keys()),
                    }
                ),
                400,
            )

        url = docs_urls[cdp]
        index_name = f"{cdp}_docs"

        es_manager.setup_index(index_name)

        docs = scraper.scrape_docs(url)
        if docs:
            es_manager.index_documents(index_name, docs)
            return jsonify(
                {
                    "message": f"Successfully indexed {len(docs)} documents for {cdp}",
                    "details": {
                        "cdp": cdp,
                        "document_count": len(docs),
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                    },
                }
            )
        else:
            return (
                jsonify(
                    {
                        "error": f"No documents found for {cdp}",
                        "suggestions": [
                            "Check if the documentation URL is accessible",
                            "Verify network connectivity",
                            "Try again later",
                        ],
                    }
                ),
                500,
            )

    except Exception as e:
        logger.error(f"Error initializing {cdp}: {e}")
        return (
            jsonify(
                {
                    "error": f"Failed to initialize {cdp}",
                    "message": str(e),
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                }
            ),
            500,
        )


@app.route("/query", methods=["POST"])
def query():
    """Enhanced query handler with improved response formatting."""
    try:
        data = request.json
        user_query = data.get("query", "").strip()
        cdp = data.get("cdp", "").lower()

        if not user_query:
            return jsonify(
                {
                    "error": "Please provide a query",
                    "suggestions": get_alternative_suggestions(cdp),
                }
            )

        cdp_keywords = [
            "cdp",
            "data",
            "profile",
            "segment",
            "audience",
            "integration",
            "track",
            "analytics",
            "source",
            "destination",
        ]
        if not any(keyword in user_query.lower() for keyword in cdp_keywords):
            return jsonify(
                {
                    "response": {
                        "message": "I can only answer questions related to CDP functionality.",
                        "suggestions": [
                            "Try asking about data integration",
                            "Ask about user profiles or segments",
                            "Query about CDP-specific features",
                        ],
                        "examples": get_alternative_suggestions(cdp),
                    }
                }
            )

        index_map = {
            "segment": "segment_docs",
            "mparticle": "mparticle_docs",
            "lytics": "lytics_docs",
            "zeotap": "zeotap_docs",
        }

        index_name = index_map.get(cdp)
        if not index_name:
            return jsonify(
                {
                    "error": "Invalid CDP specified",
                    "valid_options": list(index_map.keys()),
                }
            )

        if not es.indices.exists(index=index_name):
            return jsonify(
                {
                    "error": f"Documentation for {cdp} is not yet indexed",
                    "action_required": "Please initialize the documentation first",
                }
            )

        count = es.count(index=index_name)
        if count["count"] == 0:
            return jsonify(
                {
                    "error": f"No documentation found for {cdp}",
                    "action_required": "Please initialize the documentation first",
                }
            )

        response = es_manager.search_documents(index_name, user_query)

        if response["hits"]["hits"]:
            hit = response["hits"]["hits"][0]
            formatted_response = format_search_response(hit, user_query)

            if len(response["hits"]["hits"]) > 1:
                related_titles = [
                    hit["_source"]["title"] for hit in response["hits"]["hits"][1:4]
                ]
                formatted_response["related_topics"] = related_titles

            return jsonify({"response": formatted_response})
        else:
            return jsonify(
                {
                    "response": {
                        "message": f"I couldn't find specific information about that in the {cdp} documentation.",
                        "suggestions": get_alternative_suggestions(cdp),
                        "recommended_actions": [
                            "Try rephrasing your question",
                            "Check the general documentation",
                            "Use more specific terms",
                        ],
                    }
                }
            )
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        return (
            jsonify(
                {
                    "error": "An error occurred while processing your request",
                    "message": str(e),
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                }
            ),
            500,
        )


if __name__ == "__main__":

    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"

    app.run(debug=debug, host=host, port=port)
