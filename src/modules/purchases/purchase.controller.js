/**
 * Purchase Controller
 * Handles purchase-related HTTP requests
 */

import Purchase from "../../models/purchase.model.js";
import Book from "../../models/book.model.js";

export const purchaseController = {
  /**
   * Create a new purchase
   * POST /api/purchases
   */
  async createPurchase(req, res, next) {
    try {
      const { bookId, externalId, title, author, coverImageUrl, purchaseType = "buy", price = 0, rentalDays } = req.body;

      // Must have either bookId (library) or externalId (external/Google Books)
      if (!bookId && !externalId) {
        return res.status(400).json({
          success: false,
          message: "Book ID or External ID is required",
        });
      }

      let finalBookId = bookId;

      // If it's an external book (Google Books), verify it or create a minimal record
      if (externalId && !bookId) {
        // Check if external book is already in our system
        let book = await Book.findOne({ externalId });
        
        if (!book) {
          try {
            // Create a minimal record for external book
            book = new Book({
              externalId,
              title,
              author,
              isbn: `EXT-${externalId}`, // Unique ISBN based on externalId
              price: 0,
              stockQuantity: 999,
              availableQuantity: 999,
              coverImageUrl,
              description: "External book from Google Books",
              status: "available",
              source: "google_books",
            });
            await book.save();
          } catch (err) {
            // If duplicate key error (E11000), try to find existing book
            if (err.code === 11000) {
              book = await Book.findOne({ externalId });
              if (!book) {
                throw new Error("Failed to create or find external book");
              }
            } else {
              throw err;
            }
          }
        }
        finalBookId = book._id;
      } else if (bookId) {
        // Verify library book exists
        const book = await Book.findById(bookId);
        if (!book) {
          return res.status(404).json({
            success: false,
            message: "Book not found",
          });
        }
      }

      // Check if user already owns/rented this book
      const existingPurchase = await Purchase.findOne({
        user: req.user.id,
        book: finalBookId,
        status: { $in: ["active", "completed"] },
      });

      if (existingPurchase) {
        return res.status(400).json({
          success: false,
          message: "You have already purchased or rented this book",
        });
      }

      const purchase = new Purchase({
        user: req.user.id,
        book: finalBookId,
        purchaseType,
        price,
        paymentStatus: "completed",
        rentalDays: rentalDays || null,
        returnDate:
          purchaseType === "rent" && rentalDays
            ? new Date(Date.now() + rentalDays * 24 * 60 * 60 * 1000)
            : null,
      });

      await purchase.save();

      const savedPurchase = await Purchase.findById(purchase._id).populate([
        { path: "user", select: "username email" },
        { path: "book", select: "title author" },
      ]);

      res.status(201).json({
        success: true,
        message:
          purchaseType === "buy"
            ? "Book purchased successfully!"
            : `Book rented successfully for ${rentalDays} days!`,
        data: savedPurchase,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get user's purchases
   * GET /api/purchases/my
   */
  async getUserPurchases(req, res, next) {
    try {
      const { purchaseType, status } = req.query;

      const filter = { user: req.user.id };
      if (purchaseType) filter.purchaseType = purchaseType;
      if (status) filter.status = status;

      const purchases = await Purchase.find(filter)
        .populate("book", "title author coverImageUrl rating genre")
        .sort({ purchaseDate: -1 });

      res.status(200).json({
        success: true,
        count: purchases.length,
        data: purchases,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get purchase details
   * GET /api/purchases/:id
   */
  async getPurchase(req, res, next) {
    try {
      const purchase = await Purchase.findById(req.params.id).populate([
        { path: "user", select: "username email" },
        { path: "book", select: "title author coverImageUrl" },
      ]);

      if (!purchase) {
        return res.status(404).json({
          success: false,
          message: "Purchase not found",
        });
      }

      // Verify user owns this purchase or is admin
      if (
        purchase.user._id.toString() !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to view this purchase",
        });
      }

      res.status(200).json({
        success: true,
        data: purchase,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all purchases (admin only)
   * GET /api/purchases
   */
  async getAllPurchases(req, res, next) {
    try {
      const { purchaseType, status, page = 1, limit = 10 } = req.query;

      const filter = {};
      if (purchaseType) filter.purchaseType = purchaseType;
      if (status) filter.status = status;

      const skip = (page - 1) * limit;

      const purchases = await Purchase.find(filter)
        .populate("user", "username email")
        .populate("book", "title author")
        .sort({ purchaseDate: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Purchase.countDocuments(filter);

      res.status(200).json({
        success: true,
        count: purchases.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        data: purchases,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update purchase status
   * PATCH /api/purchases/:id/status
   */
  async updatePurchaseStatus(req, res, next) {
    try {
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Status is required",
        });
      }

      const purchase = await Purchase.findById(req.params.id);

      if (!purchase) {
        return res.status(404).json({
          success: false,
          message: "Purchase not found",
        });
      }

      // Verify user owns this purchase or is admin
      if (
        purchase.user.toString() !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to update this purchase",
        });
      }

      purchase.status = status;
      await purchase.save();

      res.status(200).json({
        success: true,
        message: "Purchase status updated successfully",
        data: purchase,
      });
    } catch (error) {
      next(error);
    }
  },
};
