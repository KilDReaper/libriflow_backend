import recommendationService from "./recommendation.service.js";
import externalBooksService from "../../services/externalBooks.service.js";

/**
 * Get AI-powered book recommendations
 * If user is logged in → personalized recommendations
 * If not logged in → trending recommendations
 */
export const getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user?._id; // Optional: user may not be logged in
    const limit = parseInt(req.query.limit) || 10;

    let result;

    if (userId) {
      // Personalized recommendations for logged-in users
      result = await recommendationService.getPersonalizedRecommendations(
        userId.toString(),
        limit
      );
    } else {
      // Trending recommendations for guests
      result = await recommendationService.getTrendingRecommendations(limit);
    }

    res.status(200).json({
      success: true,
      message: result.personalized
        ? "Personalized recommendations retrieved successfully"
        : "Trending recommendations retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recommendations by specific genre
 */
export const getRecommendationsByGenre = async (req, res, next) => {
  try {
    const { genre } = req.params;
    const userId = req.user?._id?.toString();
    const limit = parseInt(req.query.limit) || 10;
    const dataType = req.query.dataType;
    const classLevel = req.query.class;
    const course = req.query.course || genre;

    if (dataType === "academic" && course) {
      const query = `${course}${classLevel ? ` ${classLevel}` : ""}`.trim();
      const result = await recommendationService.getEmbeddingRecommendations(
        query,
        limit
      );

      res.status(200).json({
        success: true,
        message: "AI recommendations retrieved successfully",
        data: result,
      });
      return;
    }

    const result = await recommendationService.getRecommendationsByGenre(
      genre,
      userId,
      limit
    );

    res.status(200).json({
      success: true,
      message: `Recommendations for ${genre} genre retrieved successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get similar books based on a specific book
 */
export const getSimilarBooks = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const result = await recommendationService.getSimilarBooks(bookId, limit);

    res.status(200).json({
      success: true,
      message: "Similar books retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get explanation for why a book was recommended
 * Requires authentication
 */
export const getRecommendationExplanation = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const userId = req.user._id.toString();

    const result = await recommendationService.getRecommendationExplanation(
      bookId,
      userId
    );

    res.status(200).json({
      success: true,
      message: "Recommendation explanation retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get trending books (public endpoint)
 */
export const getTrendingBooks = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const result = await recommendationService.getTrendingRecommendations(
      limit
    );

    res.status(200).json({
      success: true,
      message: "Trending books retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get external book recommendations from Google Books and Open Library
 * Public endpoint - no authentication required
 */
export const getExternalRecommendations = async (req, res, next) => {
  try {
    const query = req.query.q || req.query.query;
    const limit = parseInt(req.query.limit) || 10;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query parameter is required",
      });
    }

    const books = await externalBooksService.getExternalRecommendations(
      query,
      limit
    );

    res.status(200).json({
      success: true,
      message: `Found ${books.length} external recommendations`,
      data: {
        total: books.length,
        recommendations: books,
        sources: ["google_books", "open_library"],
      },
    });
  } catch (error) {
    next(error);
  }
};
