/**
 * Borrowing Controller
 * Handles borrowing-related HTTP requests
 */

import { borrowingService } from "../../services/borrowing.service.js";

export const borrowingController = {
  /**
   * Create a new borrowing
   * POST /api/borrowings
   */
  async createBorrowing(req, res, next) {
    try {
      const { bookId, dueDays } = req.body;

      if (!bookId) {
        return res.status(400).json({
          success: false,
          message: "Book ID is required",
        });
      }

      const borrowing = await borrowingService.createBorrowing(
        req.user.id,
        bookId,
        dueDays || 14
      );

      res.status(201).json({
        success: true,
        message: `Book borrowed successfully. Due date: ${borrowing.dueDate.toDateString()}`,
        data: borrowing,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Return a borrowed book
   * POST /api/borrowings/:id/return
   */
  async returnBook(req, res, next) {
    try {
      const { id } = req.params;
      const isAdmin = req.user.role === "admin";

      const result = await borrowingService.returnBook(id, req.user.id, isAdmin);

      const message =
        result.fineDetails.fineAmount > 0
          ? `Book returned. Fine calculated: Rs ${result.fineDetails.fineAmount} for ${result.fineDetails.daysOverdue} days overdue.`
          : "Book returned on time. No fine charged.";

      res.status(200).json({
        success: true,
        message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get borrowing details
   * GET /api/borrowings/:id
   */
  async getBorrowing(req, res, next) {
    try {
      const isAdmin = req.user.role === "admin";
      const borrowing = await borrowingService.getBorrowing(
        req.params.id,
        req.user.id,
        isAdmin
      );

      res.status(200).json({
        success: true,
        data: borrowing,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get user's borrowings
   * GET /api/borrowings/my
   */
  async getUserBorrowings(req, res, next) {
    try {
      const result = await borrowingService.getUserBorrowings(
        req.user.id,
        req.query
      );

      res.status(200).json({
        success: true,
        data: result.borrowings,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get user's active borrowings
   * GET /api/borrowings/my/active
   */
  async getUserActiveBorrowings(req, res, next) {
    try {
      const borrowings = await borrowingService.getUserActiveBorrowings(
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: `You have ${borrowings.length} active borrowing(s)`,
        data: borrowings,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all borrowings (Admin)
   * GET /api/borrowings
   */
  async getAllBorrowings(req, res, next) {
    try {
      const result = await borrowingService.getAllBorrowings(req.query);

      res.status(200).json({
        success: true,
        data: result.borrowings,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get overdue books
   * GET /api/borrowings/overdue
   */
  async getOverdueBooks(req, res, next) {
    try {
      const result = await borrowingService.getOverdueBooks(req.query);

      res.status(200).json({
        success: true,
        message: `Found ${result.pagination.totalItems} overdue book(s)`,
        data: result.overdueBorrowings,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get unpaid fines
   * GET /api/borrowings/unpaid-fines
   */
  async getUnpaidFines(req, res, next) {
    try {
      const result = await borrowingService.getUnpaidFines(req.query);

      res.status(200).json({
        success: true,
        message: `Found ${result.pagination.totalItems} borrowing(s) with unpaid fine(s)`,
        data: result.unpaidFines,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get user's unpaid fines
   * GET /api/borrowings/my/unpaid-fines
   */
  async getUserUnpaidFines(req, res, next) {
    try {
      const result = await borrowingService.getUnpaidFines({
        userId: req.user.id,
      });

      const totalFine = result.unpaidFines.reduce(
        (sum, b) => sum + b.fineAmount,
        0
      );

      res.status(200).json({
        success: true,
        message:
          totalFine > 0
            ? `You have unpaid fines totaling Rs ${totalFine}`
            : "No unpaid fines",
        data: result.unpaidFines,
        totalFine,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Mark book as lost
   * PATCH /api/borrowings/:id/lost
   */
  async markAsLost(req, res, next) {
    try {
      const isAdmin = req.user.role === "admin";
      const borrowing = await borrowingService.markAsLost(
        req.params.id,
        req.user.id,
        isAdmin
      );

      res.status(200).json({
        success: true,
        message: `Book marked as lost. Fine amount: Rs ${borrowing.fineAmount}`,
        data: borrowing,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get borrowing statistics (Admin)
   * GET /api/borrowings/stats
   */
  async getBorrowingStats(req, res, next) {
    try {
      const stats = await borrowingService.getBorrowingStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get user's borrowing statistics
   * GET /api/borrowings/my/stats
   */
  async getUserBorrowingStats(req, res, next) {
    try {
      const stats = await borrowingService.getUserBorrowingStats(req.user.id);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Issue book via QR code scan (Admin only)
   * POST /api/borrow/scan
   */
  async scanQRCode(req, res, next) {
    try {
      const { qrCode, userId } = req.body;

      // Validate request body
      if (!qrCode) {
        return res.status(400).json({
          success: false,
          message: "QR code is required",
        });
      }

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required",
        });
      }

      // Check if requester is admin
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. QR code scanning is restricted to admins only",
        });
      }

      // Issue book using QR code
      const result = await borrowingService.issueBookByQRCode(qrCode, userId);

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          borrowing: result.borrowing,
          bookDetails: result.bookDetails,
          userDetails: result.userDetails,
          dueDate: result.dueDate,
          remainingCopies: result.remainingCopies,
        },
      });
    } catch (error) {
      // Handle specific errors with appropriate status codes
      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (
        error.message.includes("not available") ||
        error.message.includes("maximum borrowing limit") ||
        error.message.includes("already has")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      next(error);
    }
  },
};
