/**
 * Borrowing Routes
 * Routes for borrowing-related operations
 */

import express from "express";
import { borrowingController } from "./borrowing.controller.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import adminMiddleware from "../../middlewares/admin.middleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * User Routes
 */

// Create a new borrowing
// POST /api/borrowings
router.post("/", borrowingController.createBorrowing);

// Get user's borrowings
// GET /api/borrowings/my
router.get("/my", borrowingController.getUserBorrowings);

// Get user's active borrowings
// GET /api/borrowings/my/active
router.get("/my/active", borrowingController.getUserActiveBorrowings);

// Get user's borrowing statistics
// GET /api/borrowings/my/stats
router.get("/my/stats", borrowingController.getUserBorrowingStats);

// Get user's unpaid fines
// GET /api/borrowings/my/unpaid-fines
router.get("/my/unpaid-fines", borrowingController.getUserUnpaidFines);

// Get borrowing details
// GET /api/borrowings/:id
router.get("/:id", borrowingController.getBorrowing);

// Return a borrowed book
// POST /api/borrowings/:id/return
router.post("/:id/return", borrowingController.returnBook);

// Mark book as lost
// PATCH /api/borrowings/:id/lost
router.patch("/:id/lost", borrowingController.markAsLost);

/**
 * Admin Only Routes
 */

// Get all borrowings (admin only)
// GET /api/borrowings (with GET to retrieve all)
router.get("/", adminMiddleware, borrowingController.getAllBorrowings);

// Get overdue books
// GET /api/borrowings/overdue
router.get("/overdue", adminMiddleware, borrowingController.getOverdueBooks);

// Get unpaid fines (all)
// GET /api/borrowings/unpaid-fines
router.get("/unpaid-fines", adminMiddleware, borrowingController.getUnpaidFines);

// Get borrowing statistics
// GET /api/borrowings/stats
router.get("/stats", adminMiddleware, borrowingController.getBorrowingStats);

export default router;
