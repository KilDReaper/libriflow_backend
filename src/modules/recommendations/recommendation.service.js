import mongoose from "mongoose";
import { pipeline } from "@xenova/transformers";
import recommendationRepository from "./recommendation.repository.js";
import Book from "../../models/book.model.js";

/**
 * AI-Based Recommendation Service
 * Implements hybrid recommendation algorithm combining:
 * 1. Content-based filtering (genre preferences)
 * 2. Collaborative filtering (similar users)
 * 3. Popularity-based (trending, most borrowed)
 * 4. Quality-based (highest rated)
 */
class RecommendationService {
  constructor() {
    this.embeddingModel = "Xenova/all-MiniLM-L6-v2";
    this.extractor = null;
  }

  async initializeExtractor() {
    if (!this.extractor) {
      this.extractor = await pipeline('feature-extraction', this.embeddingModel);
    }
    return this.extractor;
  }

  /**
   * Get personalized recommendations for logged-in user
   * @param {String} userId - User ID
   * @param {Number} limit - Total recommendations to return
   * @returns {Promise<Object>}
   */
  async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Get user's borrowing history and preferences
      const userHistory =
        await recommendationRepository.getUserBorrowingHistory(
          userObjectId
        );

      // If user has no borrowing history, return trending books
      if (userHistory.totalBorrowings === 0) {
        return await this.getTrendingRecommendations(limit);
      }

      // Extract preferred genres (top 3)
      const preferredGenres = userHistory.genrePreferences
        .slice(0, 3)
        .map((g) => g._id);

      const excludeBookIds = userHistory.borrowedBookIds;

      // Parallel fetch recommendations from different strategies
      const [
        genreBasedBooks,
        collaborativeBooks,
        trendingBooks,
        highRatedBooks,
      ] = await Promise.all([
        // Content-based: Books matching user's genre preferences
        recommendationRepository.getBooksByGenrePreference(
          preferredGenres,
          excludeBookIds,
          Math.ceil(limit * 0.4) // 40% weight
        ),
        // Collaborative: Books from similar users
        recommendationRepository.getCollaborativeRecommendations(
          userObjectId,
          excludeBookIds,
          Math.ceil(limit * 0.3) // 30% weight
        ),
        // Trending: Popular books
        recommendationRepository.getTrendingBooks(
          Math.ceil(limit * 0.2) // 20% weight
        ),
        // Quality: Highest rated books
        recommendationRepository.getHighestRatedBooks(
          Math.ceil(limit * 0.1) // 10% weight
        ),
      ]);

      // Combine and deduplicate recommendations
      const combinedRecommendations = this.combineAndDeduplicate(
        [
          ...genreBasedBooks,
          ...collaborativeBooks,
          ...trendingBooks,
          ...highRatedBooks,
        ],
        excludeBookIds,
        limit
      );

      return {
        success: true,
        personalized: true,
        total: combinedRecommendations.length,
        recommendations: combinedRecommendations,
        metadata: {
          userPreferences: {
            topGenres: preferredGenres,
            totalBorrowings: userHistory.totalBorrowings,
          },
          algorithm: "hybrid",
          strategies: [
            "content-based (genre preferences)",
            "collaborative filtering",
            "trending books",
            "quality-based (ratings)",
          ],
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get personalized recommendations: ${error.message}`
      );
    }
  }

  /**
   * Get trending recommendations for non-logged-in users
   * @param {Number} limit - Total recommendations to return
   * @returns {Promise<Object>}
   */
  async getTrendingRecommendations(limit = 10) {
    try {
      // Fetch different trending strategies
      const [mostBorrowed, trending, highRated, newReleases] =
        await Promise.all([
          recommendationRepository.getMostBorrowedBooks(
            Math.ceil(limit * 0.35) // 35% weight
          ),
          recommendationRepository.getTrendingBooks(
            Math.ceil(limit * 0.35) // 35% weight
          ),
          recommendationRepository.getHighestRatedBooks(
            Math.ceil(limit * 0.2) // 20% weight
          ),
          recommendationRepository.getNewReleases(
            Math.ceil(limit * 0.1) // 10% weight
          ),
        ]);

      // Combine and deduplicate
      const combinedRecommendations = this.combineAndDeduplicate(
        [...mostBorrowed, ...trending, ...highRated, ...newReleases],
        [],
        limit
      );

      return {
        success: true,
        personalized: false,
        total: combinedRecommendations.length,
        recommendations: combinedRecommendations,
        metadata: {
          algorithm: "trending",
          strategies: [
            "most borrowed",
            "trending now",
            "highest rated",
            "new releases",
          ],
          message:
            "Login to get personalized recommendations based on your reading history",
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get trending recommendations: ${error.message}`
      );
    }
  }

  /**
   * Get recommendations by specific genre
   * @param {String} genre - Genre name
   * @param {String|null} userId - Optional user ID for excluding borrowed books
   * @param {Number} limit - Total recommendations to return
   * @returns {Promise<Object>}
   */
  async getRecommendationsByGenre(genre, userId = null, limit = 10) {
    try {
      const excludeBookIds = [];

      // If user is logged in, exclude their borrowed books
      if (userId) {
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const userHistory =
          await recommendationRepository.getUserBorrowingHistory(
            userObjectId
          );
        excludeBookIds.push(...userHistory.borrowedBookIds);
      }

      const recommendations =
        await recommendationRepository.getBooksByGenrePreference(
          [genre],
          excludeBookIds,
          limit
        );

      return {
        success: true,
        genre,
        total: recommendations.length,
        recommendations,
        metadata: {
          algorithm: "genre-based",
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get genre recommendations: ${error.message}`
      );
    }
  }

  /**
   * Get AI recommendations using embeddings with cached vectors in MongoDB
   */
  async getEmbeddingRecommendations(query, limit = 10) {
    if (!query || !query.trim()) {
      return await this.getTrendingRecommendations(limit);
    }

    try {
      const books = await Book.find({
        status: "available",
        availableQuantity: { $gt: 0 },
      })
        .select("title author genre description coverImageUrl rating totalReviews availableQuantity bookEmbedding")
        .lean();

      if (!books.length) {
        return {
          success: true,
          personalized: false,
          total: 0,
          recommendations: [],
          metadata: {
            algorithm: "embedding",
            model: this.embeddingModel,
          },
        };
      }

      const missingEmbedding = books
        .filter((book) => !Array.isArray(book.bookEmbedding) || book.bookEmbedding.length === 0)
        .map((book) => ({
          id: book._id,
          text: this.buildBookText(book),
        }))
        .filter((entry) => entry.text.length > 0);

      if (missingEmbedding.length > 0) {
        await this.populateEmbeddings(missingEmbedding);
      }

      const refreshedBooks = await Book.find({
        _id: { $in: books.map((book) => book._id) },
      })
        .select("title author genre description coverImageUrl rating totalReviews availableQuantity bookEmbedding")
        .lean();

      const queryEmbedding = await this.fetchEmbedding(query);

      const scored = refreshedBooks
        .filter((book) => Array.isArray(book.bookEmbedding) && book.bookEmbedding.length > 0)
        .map((book) => ({
          ...book,
          recommendationScore: this.cosineSimilarity(queryEmbedding, book.bookEmbedding),
          reason: "AI embedding match",
        }))
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);

      return {
        success: true,
        personalized: false,
        total: scored.length,
        recommendations: scored,
        metadata: {
          algorithm: "embedding",
          model: this.embeddingModel,
        },
      };
    } catch (error) {
      console.error("Embedding recommendation failed, falling back to genre-based:", error.message);
      return await this.getRecommendationsByGenre(query, null, limit);
    }
  }

  buildBookText(book) {
    const parts = [book.title, book.author, ...(book.genre || []), book.description];
    return parts.filter(Boolean).join(" | ");
  }

  async populateEmbeddings(missingEmbedding) {
    const batchSize = 16;
    for (let i = 0; i < missingEmbedding.length; i += batchSize) {
      const batch = missingEmbedding.slice(i, i + batchSize);
      const texts = batch.map((item) => item.text);
      const embeddings = await this.fetchEmbeddings(texts);
      await Promise.all(
        batch.map((item, index) =>
          Book.updateOne({ _id: item.id }, { bookEmbedding: embeddings[index] })
        )
      );
    }
  }

  async fetchEmbedding(text) {
    const [embedding] = await this.fetchEmbeddings([text]);
    return embedding;
  }

  async fetchEmbeddings(texts) {
    try {
      // Use local embeddings (no API needed)
      const extractor = await this.initializeExtractor();
      const embeddings = [];
      
      for (const text of texts) {
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        embeddings.push(Array.from(output.data));
      }
      
      return embeddings;
    } catch (error) {
      console.error("Local embedding error:", error.message);
      throw new Error(`Local embedding failed: ${error.message}`);
    }
  }

  normalizeEmbedding(vector) {
    if (!Array.isArray(vector)) {
      return [];
    }

    if (vector.length > 0 && typeof vector[0] === "number") {
      return vector;
    }

    if (Array.isArray(vector[0])) {
      const tokenEmbeddings = vector;
      const dims = tokenEmbeddings[0]?.length || 0;
      if (dims === 0) {
        return [];
      }
      const pooled = new Array(dims).fill(0);
      for (const token of tokenEmbeddings) {
        for (let i = 0; i < dims; i += 1) {
          pooled[i] += token[i] || 0;
        }
      }
      return pooled.map((value) => value / tokenEmbeddings.length);
    }

    return [];
  }

  cosineSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) {
      return 0;
    }

    const length = Math.min(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < length; i += 1) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get similar books based on a specific book
   * @param {String} bookId - Book ID
   * @param {Number} limit - Total recommendations to return
   * @returns {Promise<Object>}
   */
  async getSimilarBooks(bookId, limit = 10) {
    try {
      const Book = mongoose.model("Book");
      const book = await Book.findById(bookId);

      if (!book) {
        throw new Error("Book not found");
      }

      // Find books with similar genres
      const similarBooks =
        await recommendationRepository.getBooksByGenrePreference(
          book.genre,
          [new mongoose.Types.ObjectId(bookId)],
          limit
        );

      return {
        success: true,
        basedOn: {
          title: book.title,
          author: book.author,
          genres: book.genre,
        },
        total: similarBooks.length,
        recommendations: similarBooks.map((b) => ({
          ...b,
          reason: `Similar to "${book.title}"`,
        })),
        metadata: {
          algorithm: "similarity-based",
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to get similar books: ${error.message}`
      );
    }
  }

  /**
   * Combine recommendations from multiple sources and remove duplicates
   * Prioritizes books with higher scores and earlier appearance
   * @param {Array} books - Array of book recommendations
   * @param {Array} excludeIds - Book IDs to exclude
   * @param {Number} limit - Maximum books to return
   * @returns {Array}
   */
  combineAndDeduplicate(books, excludeIds = [], limit = 10) {
    const seen = new Set(excludeIds.map((id) => id.toString()));
    const uniqueBooks = [];

    for (const book of books) {
      const bookIdStr = book._id.toString();

      if (!seen.has(bookIdStr) && uniqueBooks.length < limit) {
        seen.add(bookIdStr);
        uniqueBooks.push(book);
      }

      if (uniqueBooks.length >= limit) {
        break;
      }
    }

    return uniqueBooks;
  }

  /**
   * Calculate diversity score for recommendation quality
   * @param {Array} recommendations - Array of recommendations
   * @returns {Object}
   */
  calculateDiversityMetrics(recommendations) {
    const genres = new Set();
    const authors = new Set();

    recommendations.forEach((book) => {
      if (book.genre) {
        book.genre.forEach((g) => genres.add(g));
      }
      if (book.author) {
        authors.add(book.author);
      }
    });

    return {
      uniqueGenres: genres.size,
      uniqueAuthors: authors.size,
      diversityScore: (genres.size + authors.size) / 2,
    };
  }

  /**
   * Get recommendation explanation for a specific book
   * @param {String} bookId - Book ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>}
   */
  async getRecommendationExplanation(bookId, userId) {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const bookObjectId = new mongoose.Types.ObjectId(bookId);

      const Book = mongoose.model("Book");
      const book = await Book.findById(bookObjectId);

      if (!book) {
        throw new Error("Book not found");
      }

      const userHistory =
        await recommendationRepository.getUserBorrowingHistory(
          userObjectId
        );

      const reasons = [];

      // Check genre match
      const userGenres = userHistory.genrePreferences.map(
        (g) => g._id
      );
      const genreMatches = book.genre.filter((g) =>
        userGenres.includes(g)
      );

      if (genreMatches.length > 0) {
        reasons.push({
          type: "genre_match",
          explanation: `Matches your preferred genres: ${genreMatches.join(", ")}`,
          weight: "high",
        });
      }

      // Check rating
      if (book.rating >= 4.5) {
        reasons.push({
          type: "high_rating",
          explanation: `Highly rated: ${book.rating}/5 (${book.totalReviews} reviews)`,
          weight: "medium",
        });
      }

      // Check popularity
      const borrowCount = await mongoose
        .model("Borrowing")
        .countDocuments({ book: bookObjectId });

      if (borrowCount > 10) {
        reasons.push({
          type: "popular",
          explanation: `Popular book borrowed ${borrowCount} times`,
          weight: "medium",
        });
      }

      return {
        success: true,
        book: {
          title: book.title,
          author: book.author,
        },
        reasons,
        confidence:
          reasons.length > 0 ? "high" : "medium",
      };
    } catch (error) {
      throw new Error(
        `Failed to get recommendation explanation: ${error.message}`
      );
    }
  }
}

export default new RecommendationService();
