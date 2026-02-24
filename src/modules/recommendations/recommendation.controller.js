import recommendationService from "./recommendation.service.js";

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
