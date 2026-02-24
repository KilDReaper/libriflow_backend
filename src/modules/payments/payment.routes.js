/**
 * Payment Routes
 * Routes for payment-related operations
 */

import express from "express";
import { paymentController } from "./payment.controller.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import adminMiddleware from "../../middlewares/admin.middleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * User Routes
 */

// Create a payment
// POST /api/payments
router.post("/", paymentController.createPayment);

// Get user's payments
// GET /api/payments/my
router.get("/my", paymentController.getUserPayments);

// Get user's payment statistics
// GET /api/payments/my/stats
router.get("/my/stats", paymentController.getUserPaymentStats);

// Get payment details
// GET /api/payments/:id
router.get("/:id", paymentController.getPayment);

// Verify payment
// PATCH /api/payments/:id/verify
router.patch("/:id/verify", paymentController.verifyPayment);

// Cancel payment
// PATCH /api/payments/:id/cancel
router.patch("/:id/cancel", paymentController.cancelPayment);

// Retry failed payment
// POST /api/payments/:id/retry
router.post("/:id/retry", paymentController.retryPayment);

/**
 * Admin Only Routes
 */

// Get all payments (admin only)
// GET /api/payments
router.get("/", adminMiddleware, paymentController.getAllPayments);

// Get payment statistics
// GET /api/payments/stats
router.get("/stats", adminMiddleware, paymentController.getPaymentStats);

/**
 * Webhook Routes (No authentication required)
 */

// Khalti payment webhook
// POST /api/payments/webhook/khalti
router.post("/webhook/khalti", paymentController.khaltiWebhook);

// eSewa payment webhook
// GET /api/payments/webhook/esewa
router.get("/webhook/esewa", paymentController.esewaWebhook);

export default router;
