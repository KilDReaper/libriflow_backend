/**
 * Purchase Routes
 * Routes for purchase-related operations
 */

import express from "express";
import { purchaseController } from "./purchase.controller.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import adminMiddleware from "../../middlewares/admin.middleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * Admin Routes
 */

// Get all purchases (admin only)
// GET /api/purchases
router.get("/", adminMiddleware, purchaseController.getAllPurchases);

/**
 * User Routes
 */

// Create a new purchase
// POST /api/purchases
router.post("/", purchaseController.createPurchase);

// Get user's purchases
// GET /api/purchases/my
router.get("/my", purchaseController.getUserPurchases);

// Get single purchase details
// GET /api/purchases/:id
router.get("/:id", purchaseController.getPurchase);

// Update purchase status
// PATCH /api/purchases/:id/status
router.patch("/:id/status", purchaseController.updatePurchaseStatus);

export default router;
