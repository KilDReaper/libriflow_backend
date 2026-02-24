import Book from "../../models/book.model.js";
import Borrowing from "../../models/borrowing.model.js";

class RecommendationRepository {
  /**
   * Get most borrowed books across all users
   * @param {Number} limit - Number of books to return
   * @returns {Promise<Array>}
   */
  async getMostBorrowedBooks(limit = 10) {
    return await Borrowing.aggregate([
      {
        $group: {
          _id: "$book",
          borrowCount: { $sum: 1 },
          lastBorrowedDate: { $max: "$borrowDate" },
        },
      },
      { $sort: { borrowCount: -1, lastBorrowedDate: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "books",
          localField: "_id",
          foreignField: "_id",
          as: "bookDetails",
        },
      },
      { $unwind: "$bookDetails" },
      {
        $match: {
          "bookDetails.status": "available",
          "bookDetails.availableQuantity": { $gt: 0 },
        },
      },
      {
        $project: {
          _id: "$bookDetails._id",
          title: "$bookDetails.title",
          author: "$bookDetails.author",
          isbn: "$bookDetails.isbn",
          genre: "$bookDetails.genre",
          description: "$bookDetails.description",
          coverImageUrl: "$bookDetails.coverImageUrl",
          price: "$bookDetails.price",
          rating: "$bookDetails.rating",
          totalReviews: "$bookDetails.totalReviews",
          availableQuantity: "$bookDetails.availableQuantity",
          borrowCount: 1,
          reason: { $literal: "Most borrowed book" },
          recommendationScore: "$borrowCount",
        },
      },
    ]);
  }

  /**
   * Get highest rated books
   * @param {Number} limit - Number of books to return
   * @returns {Promise<Array>}
   */
  async getHighestRatedBooks(limit = 10) {
    return await Book.aggregate([
      {
        $match: {
          status: "available",
          availableQuantity: { $gt: 0 },
          rating: { $gte: 4 },
          totalReviews: { $gte: 5 }, // Minimum reviews for credibility
        },
      },
      {
        $sort: {
          rating: -1,
          totalReviews: -1,
        },
      },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          author: 1,
          isbn: 1,
          genre: 1,
          description: 1,
          coverImageUrl: 1,
          price: 1,
          rating: 1,
          totalReviews: 1,
          availableQuantity: 1,
          reason: { $literal: "Highly rated book" },
          recommendationScore: "$rating",
        },
      },
    ]);
  }

  /**
   * Get trending books (recently borrowed + highly rated)
   * @param {Number} limit - Number of books to return
   * @returns {Promise<Array>}
   */
  async getTrendingBooks(limit = 10) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await Borrowing.aggregate([
      {
        $match: {
          borrowDate: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: "$book",
          recentBorrowCount: { $sum: 1 },
          lastBorrowedDate: { $max: "$borrowDate" },
        },
      },
      { $sort: { recentBorrowCount: -1 } },
      { $limit: limit * 2 }, // Get more for filtering
      {
        $lookup: {
          from: "books",
          localField: "_id",
          foreignField: "_id",
          as: "bookDetails",
        },
      },
      { $unwind: "$bookDetails" },
      {
        $match: {
          "bookDetails.status": "available",
          "bookDetails.availableQuantity": { $gt: 0 },
        },
      },
      {
        $addFields: {
          trendingScore: {
            $add: [
              { $multiply: ["$recentBorrowCount", 2] }, // Weight recent borrows
              { $multiply: ["$bookDetails.rating", 1] }, // Add rating score
            ],
          },
        },
      },
      { $sort: { trendingScore: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: "$bookDetails._id",
          title: "$bookDetails.title",
          author: "$bookDetails.author",
          isbn: "$bookDetails.isbn",
          genre: "$bookDetails.genre",
          description: "$bookDetails.description",
          coverImageUrl: "$bookDetails.coverImageUrl",
          price: "$bookDetails.price",
          rating: "$bookDetails.rating",
          totalReviews: "$bookDetails.totalReviews",
          availableQuantity: "$bookDetails.availableQuantity",
          recentBorrowCount: 1,
          reason: { $literal: "Trending now" },
          recommendationScore: "$trendingScore",
        },
      },
    ]);
  }

  /**
   * Get user's borrowing history with genre preferences
   * @param {String} userId - User ID
   * @returns {Promise<Object>}
   */
  async getUserBorrowingHistory(userId) {
    const history = await Borrowing.aggregate([
      {
        $match: {
          user: userId,
        },
      },
      {
        $lookup: {
          from: "books",
          localField: "book",
          foreignField: "_id",
          as: "bookDetails",
        },
      },
      { $unwind: "$bookDetails" },
      {
        $facet: {
          genrePreferences: [
            { $unwind: "$bookDetails.genre" },
            {
              $group: {
                _id: "$bookDetails.genre",
                count: { $sum: 1 },
                lastBorrowed: { $max: "$borrowDate" },
              },
            },
            { $sort: { count: -1, lastBorrowed: -1 } },
          ],
          borrowedBookIds: [
            {
              $group: {
                _id: null,
                bookIds: { $addToSet: "$book" },
              },
            },
          ],
          totalBorrowings: [
            {
              $count: "total",
            },
          ],
        },
      },
    ]);

    return {
      genrePreferences:
        history[0]?.genrePreferences || [],
      borrowedBookIds:
        history[0]?.borrowedBookIds[0]?.bookIds || [],
      totalBorrowings:
        history[0]?.totalBorrowings[0]?.total || 0,
    };
  }

  /**
   * Get books based on user's genre preferences (excluding already borrowed)
   * @param {Array<String>} preferredGenres - User's preferred genres
   * @param {Array<ObjectId>} excludeBookIds - Books to exclude
   * @param {Number} limit - Number of books to return
   * @returns {Promise<Array>}
   */
  async getBooksByGenrePreference(
    preferredGenres,
    excludeBookIds = [],
    limit = 10
  ) {
    return await Book.aggregate([
      {
        $match: {
          _id: { $nin: excludeBookIds },
          status: "available",
          availableQuantity: { $gt: 0 },
          genre: { $in: preferredGenres },
        },
      },
      {
        $addFields: {
          genreMatchScore: {
            $size: {
              $setIntersection: ["$genre", preferredGenres],
            },
          },
          qualityScore: {
            $add: [
              { $multiply: ["$rating", 2] },
              { $divide: ["$totalReviews", 10] },
            ],
          },
        },
      },
      {
        $addFields: {
          personalizedScore: {
            $add: [
              { $multiply: ["$genreMatchScore", 5] }, // Genre match weight
              "$qualityScore",
            ],
          },
        },
      },
      { $sort: { personalizedScore: -1, rating: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          author: 1,
          isbn: 1,
          genre: 1,
          description: 1,
          coverImageUrl: 1,
          price: 1,
          rating: 1,
          totalReviews: 1,
          availableQuantity: 1,
          reason: {
            $literal: "Based on your reading preferences",
          },
          recommendationScore: "$personalizedScore",
        },
      },
    ]);
  }

  /**
   * Get collaborative filtering recommendations
   * (Books borrowed by users with similar taste)
   * @param {String} userId - User ID
   * @param {Array<ObjectId>} excludeBookIds - Books to exclude
   * @param {Number} limit - Number of books to return
   * @returns {Promise<Array>}
   */
  async getCollaborativeRecommendations(
    userId,
    excludeBookIds = [],
    limit = 10
  ) {
    return await Borrowing.aggregate([
      // Find books user has borrowed
      {
        $match: {
          user: userId,
        },
      },
      {
        $group: {
          _id: null,
          userBooks: { $addToSet: "$book" },
        },
      },
      // Find other users who borrowed the same books
      {
        $lookup: {
          from: "borrowings",
          let: { userBooks: "$userBooks" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$book", "$$userBooks"] }, // Same books
                    { $ne: ["$user", userId] }, // Different users
                  ],
                },
              },
            },
            {
              $group: {
                _id: "$user",
                commonBooks: { $addToSet: "$book" },
                allBooks: { $addToSet: "$book" },
              },
            },
            // Calculate similarity score
            {
              $addFields: {
                similarityScore: { $size: "$commonBooks" },
              },
            },
            { $sort: { similarityScore: -1 } },
            { $limit: 20 }, // Top similar users
          ],
          as: "similarUsers",
        },
      },
      { $unwind: "$similarUsers" },
      // Get books borrowed by similar users
      {
        $lookup: {
          from: "borrowings",
          let: { similarUserId: "$similarUsers._id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$user", "$$similarUserId"] },
              },
            },
            {
              $group: {
                _id: "$book",
                borrowCount: { $sum: 1 },
              },
            },
          ],
          as: "recommendedBooks",
        },
      },
      { $unwind: "$recommendedBooks" },
      // Exclude already borrowed books
      {
        $match: {
          "recommendedBooks._id": { $nin: excludeBookIds },
        },
      },
      // Group and calculate recommendation scores
      {
        $group: {
          _id: "$recommendedBooks._id",
          collaborativeScore: {
            $sum: {
              $multiply: [
                "$similarUsers.similarityScore",
                "$recommendedBooks.borrowCount",
              ],
            },
          },
          fromSimilarUsers: { $sum: 1 },
        },
      },
      { $sort: { collaborativeScore: -1 } },
      { $limit: limit },
      // Join with books collection
      {
        $lookup: {
          from: "books",
          localField: "_id",
          foreignField: "_id",
          as: "bookDetails",
        },
      },
      { $unwind: "$bookDetails" },
      {
        $match: {
          "bookDetails.status": "available",
          "bookDetails.availableQuantity": { $gt: 0 },
        },
      },
      {
        $project: {
          _id: "$bookDetails._id",
          title: "$bookDetails.title",
          author: "$bookDetails.author",
          isbn: "$bookDetails.isbn",
          genre: "$bookDetails.genre",
          description: "$bookDetails.description",
          coverImageUrl: "$bookDetails.coverImageUrl",
          price: "$bookDetails.price",
          rating: "$bookDetails.rating",
          totalReviews: "$bookDetails.totalReviews",
          availableQuantity: "$bookDetails.availableQuantity",
          reason: {
            $literal: "Users with similar taste also borrowed this",
          },
          recommendationScore: "$collaborativeScore",
        },
      },
    ]);
  }

  /**
   * Get new releases (recently added books)
   * @param {Number} limit - Number of books to return
   * @returns {Promise<Array>}
   */
  async getNewReleases(limit = 10) {
    return await Book.aggregate([
      {
        $match: {
          status: "available",
          availableQuantity: { $gt: 0 },
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          title: 1,
          author: 1,
          isbn: 1,
          genre: 1,
          description: 1,
          coverImageUrl: 1,
          price: 1,
          rating: 1,
          totalReviews: 1,
          availableQuantity: 1,
          createdAt: 1,
          reason: { $literal: "New arrival" },
          recommendationScore: {
            $subtract: [new Date(), "$createdAt"],
          },
        },
      },
    ]);
  }
}

export default new RecommendationRepository();
