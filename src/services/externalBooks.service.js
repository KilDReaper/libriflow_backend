import axios from "axios";

/**
 * External Books Service
 * Fetches book recommendations from external APIs (Google Books, Open Library)
 * Features: caching, rate limiting, retry logic
 */
class ExternalBooksService {
  constructor() {
    this.googleBooksApiUrl = "https://www.googleapis.com/books/v1/volumes";
    this.openLibraryApiUrl = "https://openlibrary.org/search.json";
    this.searchCache = new Map(); // Simple in-memory cache
    this.cacheExpiration = 3600000; // 1 hour in milliseconds
    this.requestDelay = 1000; // 1000ms delay between requests to respect rate limits
    this.lastRequestTime = 0;
  }

  /**
   * Add delay between requests to respect rate limits
   */
  async delayRequest() {
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.requestDelay - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Get from cache or return null
   */
  getFromCache(key) {
    const cached = this.searchCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheExpiration) {
      this.searchCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Save to cache
   */
  saveToCache(key, data) {
    this.searchCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (
          error.response?.status === 429 && // Rate limited
          i < maxRetries - 1
        ) {
          const delayMs = Math.pow(2, i) * 1000; // 1s, 2s, 4s
          console.log(
            `Rate limited, retrying in ${delayMs}ms... (attempt ${i + 1}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw error;
      }
    }
  }

  /**
   * Search books from Google Books API
   */
  async searchGoogleBooks(query, maxResults = 20) {
    const cacheKey = `google_${query}_${maxResults}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log("Returning cached Google Books results");
      return cached;
    }

    try {
      await this.delayRequest();

      const results = await this.retryWithBackoff(async () => {
        const response = await axios.get(this.googleBooksApiUrl, {
          params: {
            q: query,
            maxResults,
            orderBy: "relevance",
            printType: "books",
          },
          timeout: 10000,
        });

        if (!response.data.items) {
          return [];
        }

        return response.data.items.map((item) => this.formatGoogleBook(item));
      });

      this.saveToCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error("Google Books API error:", error.message);
      return [];
    }
  }

  /**
   * Search books from Open Library API
   */
  async searchOpenLibrary(query, limit = 20) {
    const cacheKey = `openlibrary_${query}_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log("Returning cached Open Library results");
      return cached;
    }

    try {
      await this.delayRequest();

      const response = await axios.get(this.openLibraryApiUrl, {
        params: {
          q: query,
          limit,
          fields: "key,title,author_name,isbn,first_publish_year,cover_i,subject,ratings_average,ratings_count",
        },
        timeout: 10000,
      });

      if (!response.data.docs) {
        return [];
      }

      const results = response.data.docs.map((doc) => this.formatOpenLibraryBook(doc));
      this.saveToCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error("Open Library API error:", error.message);
      return [];
    }
  }

  /**
   * Get external recommendations combining multiple sources
   */
  async getExternalRecommendations(query, limit = 10) {
    try {
      // Fetch from both APIs sequentially to avoid rate limiting issues
      const googleBooks = await this.searchGoogleBooks(query, limit);
      const openLibraryBooks = await this.searchOpenLibrary(query, limit);

      // Combine and deduplicate by title
      const combined = [...googleBooks, ...openLibraryBooks];
      const uniqueBooks = this.deduplicateBooks(combined);

      // Sort by rating and limit
      return uniqueBooks
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, limit);
    } catch (error) {
      console.error("External recommendations error:", error.message);
      throw new Error(`Failed to fetch external recommendations: ${error.message}`);
    }
  }

  /**
   * Format Google Books response to our standard format
   */
  formatGoogleBook(item) {
    const volumeInfo = item.volumeInfo || {};
    const saleInfo = item.saleInfo || {};

    return {
      externalId: item.id,
      source: "google_books",
      title: volumeInfo.title || "Unknown Title",
      author: volumeInfo.authors?.join(", ") || "Unknown Author",
      isbn: volumeInfo.industryIdentifiers?.[0]?.identifier || null,
      genre: volumeInfo.categories || [],
      description: volumeInfo.description || "",
      coverImageUrl: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || null,
      publishedDate: volumeInfo.publishedDate || null,
      publisher: volumeInfo.publisher || null,
      pageCount: volumeInfo.pageCount || null,
      language: volumeInfo.language || "en",
      rating: volumeInfo.averageRating || null,
      totalReviews: volumeInfo.ratingsCount || 0,
      previewLink: volumeInfo.previewLink || null,
      buyLink: saleInfo.buyLink || null,
      isExternal: true,
    };
  }

  /**
   * Format Open Library response to our standard format
   */
  formatOpenLibraryBook(doc) {
    return {
      externalId: doc.key,
      source: "open_library",
      title: doc.title || "Unknown Title",
      author: doc.author_name?.join(", ") || "Unknown Author",
      isbn: doc.isbn?.[0] || null,
      genre: doc.subject?.slice(0, 3) || [],
      description: "",
      coverImageUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : null,
      publishedDate: doc.first_publish_year ? `${doc.first_publish_year}` : null,
      publisher: null,
      pageCount: null,
      language: "en",
      rating: doc.ratings_average || null,
      totalReviews: doc.ratings_count || 0,
      previewLink: `https://openlibrary.org${doc.key}`,
      buyLink: null,
      isExternal: true,
    };
  }

  /**
   * Deduplicate books by title similarity
   */
  deduplicateBooks(books) {
    const seen = new Map();
    const result = [];

    for (const book of books) {
      const normalizedTitle = book.title.toLowerCase().trim();
      
      if (!seen.has(normalizedTitle)) {
        seen.set(normalizedTitle, true);
        result.push(book);
      }
    }

    return result;
  }
}

export default new ExternalBooksService();
