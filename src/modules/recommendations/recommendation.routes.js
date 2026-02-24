import { Router } from "express";
import * as controller from "./recommendation.controller.js";

const router = Router();

/**
 * Optional authentication middleware
 * If user is logged in, adds user to req.user
 * If not, continues without user
 */
const optionalAuth = (req, res, next) => {
  // Import auth middleware dynamically
  import("../../middlewares/auth.middleware.js")
    .then((authModule) => {
      const authMiddleware = authModule.default;

      // Check if Authorization header exists
      const token = req.headers.authorization?.split(" ")[1];

      if (token) {
        // User is logged in, validate token
        authMiddleware(req, res, next);
      } else {
        // No token, continue without user
        next();
      }
    })
    .catch(() => {
      // If auth middleware fails to load, continue without user
      next();
    });
};

// Main recommendation endpoint - supports both logged-in and guest users
router.get("/", optionalAuth, controller.getRecommendations);

// Get trending books (public)
router.get("/trending", controller.getTrendingBooks);

// Get recommendations by genre (public, personalized if logged in)
router.get("/genre/:genre", optionalAuth, controller.getRecommendationsByGenre);

// Get similar books based on a specific book (public)
router.get("/similar/:bookId", controller.getSimilarBooks);

// Get explanation for a recommendation (requires auth)
router.get("/explain/:bookId", optionalAuth, controller.getRecommendationExplanation);

export default router;
