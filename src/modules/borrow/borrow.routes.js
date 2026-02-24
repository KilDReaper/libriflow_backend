/**
 * Borrow Routes (QR Code System)
 * Routes for QR code-based book issuing
 */

import express from "express";
import { borrowingController } from "../borrowings/borrowing.controller.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import adminMiddleware from "../../middlewares/admin.middleware.js";

const router = express.Router();

/**
 * QR Code Scan Route
 * POST /api/borrow/scan
 * 
 * Admin-only endpoint for issuing books via QR code scanning
 * 
 * Body:
 * {
 *   qrCode: string,  // QR code value from scanned book
 *   userId: string   // User ID to issue the book to
 * }
 * 
 * Process:
 * 1. Validates admin authorization
 * 2. Finds book by QR code
 * 3. Validates book availability
 * 4. Validates user status
 * 5. Creates borrowing record
 * 6. Updates available copies
 */
router.post(
  "/scan",
  authMiddleware,
  adminMiddleware,
  borrowingController.scanQRCode
);

export default router;
