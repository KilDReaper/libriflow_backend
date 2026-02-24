/**
 * Borrowing Service
 * Handles borrowing operations including fine calculation
 */

import { borrowingRepository } from "../modules/borrowings/borrowing.repository.js";
import Book from "../models/book.model.js";
import User from "../models/user.model.js";

// Fine rate: Rs 5 per day after due date
const FINE_RATE_PER_DAY = 5;

export const borrowingService = {
  /**
   * Create a new borrowing record
   */
  async createBorrowing(userId, bookId, dueDays = 14) {
    try {
      // Validate user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Validate book
      const book = await Book.findById(bookId);
      if (!book) {
        throw new Error("Book not found");
      }

      // Check book availability
      if (book.availableQuantity < 1) {
        throw new Error("Book not available for borrowing");
      }

      // Check user's active borrowings limit (optional - customize as needed)
      const activeBorrowings = await borrowingRepository.findActiveBorrowings(
        userId
      );
      if (activeBorrowings.length >= 5) {
        throw new Error("You have reached the maximum borrowing limit (5 books)");
      }

      // Calculate due date
      const borrowDate = new Date();
      const dueDate = new Date(borrowDate);
      dueDate.setDate(dueDate.getDate() + dueDays);

      // Create borrowing record
      const borrowingData = {
        user: userId,
        book: bookId,
        borrowDate,
        dueDate,
        status: "active",
      };

      const borrowing = await borrowingRepository.create(borrowingData);

      // Decrease book availability
      await Book.findByIdAndUpdate(bookId, {
        $inc: { availableQuantity: -1 },
      });

      return await borrowingRepository.findById(borrowing._id);
    } catch (error) {
      throw new Error(`Failed to create borrowing: ${error.message}`);
    }
  },

  /**
   * Return a borrowed book and calculate fine if overdue
   */
  async returnBook(borrowingId, userId, isAdmin) {
    try {
      const borrowing = await borrowingRepository.findById(borrowingId);

      if (!borrowing) {
        throw new Error("Borrowing record not found");
      }

      // Authorization check
      if (!isAdmin && borrowing.user._id.toString() !== userId) {
        throw new Error("Not authorized to return this book");
      }

      // Check if already returned
      if (borrowing.status === "returned") {
        throw new Error("Book already returned");
      }

      if (borrowing.status === "lost") {
        throw new Error("Cannot return a book marked as lost");
      }

      // Calculate fine if overdue
      const returnDate = new Date();
      let fineAmount = 0;

      if (returnDate > borrowing.dueDate) {
        const daysOverdue = this.calculateDaysOverdue(
          borrowing.dueDate,
          returnDate
        );
        fineAmount = daysOverdue * FINE_RATE_PER_DAY;
      }

      // Determine status: returned or overdue
      const newStatus = fineAmount > 0 ? "returned" : "returned";

      // Update borrowing record
      const updatedBorrowing = await borrowingRepository.update(borrowingId, {
        returnedDate: returnDate,
        status: newStatus,
        fineAmount: fineAmount,
        finePaid: fineAmount === 0, // If no fine, mark as paid
      });

      // Increase book availability
      await Book.findByIdAndUpdate(borrowing.book._id, {
        $inc: { availableQuantity: 1 },
      });

      return {
        borrowing: updatedBorrowing,
        fineDetails: {
          daysOverdue:
            returnDate > borrowing.dueDate
              ? this.calculateDaysOverdue(borrowing.dueDate, returnDate)
              : 0,
          fineAmount: fineAmount,
          fineRate: `Rs ${FINE_RATE_PER_DAY} per day`,
          finePaid: fineAmount === 0,
        },
      };
    } catch (error) {
      throw new Error(`Failed to return book: ${error.message}`);
    }
  },

  /**
   * Get borrowing details
   */
  async getBorrowing(borrowingId, userId, isAdmin) {
    const borrowing = await borrowingRepository.findById(borrowingId);

    if (!borrowing) {
      throw new Error("Borrowing not found");
    }

    // Authorization check
    if (!isAdmin && borrowing.user._id.toString() !== userId) {
      throw new Error("Not authorized to view this borrowing");
    }

    return this.formatBorrowingResponse(borrowing);
  },

  /**
   * Get user's borrowings
   */
  async getUserBorrowings(userId, query) {
    const { page = 1, limit = 10, status } = query;

    const borrowings = await borrowingRepository.findByUser(userId, {
      page,
      limit,
      status,
    });

    const total = await borrowingRepository.countByUser(
      userId,
      status ? { status } : {}
    );

    return {
      borrowings: borrowings.map((b) => this.formatBorrowingResponse(b)),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    };
  },

  /**
   * Get user's active borrowings
   */
  async getUserActiveBorrowings(userId) {
    const borrowings = await borrowingRepository.findActiveBorrowings(userId);

    // Calculate remaining days and fine status for each
    return borrowings.map((b) => {
      const now = new Date();
      const daysRemaining = Math.ceil(
        (b.dueDate - now) / (1000 * 60 * 60 * 24)
      );
      const isOverdue = daysRemaining < 0;
      const daysOverdue = isOverdue ? Math.abs(daysRemaining) : 0;
      const estimatedFine = isOverdue ? daysOverdue * FINE_RATE_PER_DAY : 0;

      return {
        ...b.toObject(),
        daysRemaining,
        isOverdue,
        estimatedFine,
      };
    });
  },

  /**
   * Get all borrowings (Admin)
   */
  async getAllBorrowings(query) {
    const { page = 1, limit = 10, status, userId } = query;

    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.user = userId;

    const borrowings = await borrowingRepository.findAll(filter, {
      page,
      limit,
    });
    const total = await borrowingRepository.count(filter);

    return {
      borrowings: borrowings.map((b) => this.formatBorrowingResponse(b)),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    };
  },

  /**
   * Get overdue borrowings
   */
  async getOverdueBooks(query) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const overdueBorrowings = await borrowingRepository.findOverdue();

    // Calculate fine for each overdue book
    const enrichedData = overdueBorrowings
      .slice(skip, skip + limit)
      .map((b) => {
        const daysOverdue = this.calculateDaysOverdue(b.dueDate, new Date());
        const estimatedFine = daysOverdue * FINE_RATE_PER_DAY;

        return {
          ...b.toObject(),
          daysOverdue,
          estimatedFine,
          message: `${b.user.username}'s book "${b.book.title}" is ${daysOverdue} days overdue`,
        };
      });

    return {
      overdueBorrowings: enrichedData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(overdueBorrowings.length / limit),
        totalItems: overdueBorrowings.length,
        itemsPerPage: parseInt(limit),
      },
    };
  },

  /**
   * Get borrowings with unpaid fines
   */
  async getUnpaidFines(query) {
    const { page = 1, limit = 10, userId } = query;

    let borrowings;
    let total;

    if (userId) {
      borrowings = await borrowingRepository.findUserUnpaidFines(userId);
      total = borrowings.length;
    } else {
      borrowings = await borrowingRepository.findUnpaidFines({ page, limit });
      total = await borrowingRepository.count({
        fineAmount: { $gt: 0 },
        finePaid: false,
      });
    }

    return {
      unpaidFines: borrowings.map((b) => ({
        ...b.toObject(),
        daysOverdue: this.calculateDaysOverdue(b.dueDate, b.returnedDate),
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    };
  },

  /**
   * Mark book as lost
   */
  async markAsLost(borrowingId, userId, isAdmin) {
    const borrowing = await borrowingRepository.findById(borrowingId);

    if (!borrowing) {
      throw new Error("Borrowing not found");
    }

    // Authorization check
    if (!isAdmin && borrowing.user._id.toString() !== userId) {
      throw new Error("Not authorized to mark this as lost");
    }

    if (borrowing.status === "returned" || borrowing.status === "lost") {
      throw new Error(`Cannot mark as lost. Status: ${borrowing.status}`);
    }

    // Set fine to book price or default amount
    const finePenalty = borrowing.book.price || 500;

    const updated = await borrowingRepository.update(borrowingId, {
      status: "lost",
      fineAmount: borrowing.fineAmount + finePenalty,
    });

    // Increase book availability (not really available, but for tracking)
    // In practice, you might want to handle this differently

    return updated;
  },

  /**
   * Calculate days overdue between due date and return date
   */
  calculateDaysOverdue(dueDate, returnedDate) {
    const timeDiff = returnedDate - dueDate;
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  },

  /**
   * Get borrowing statistics
   */
  async getBorrowingStats() {
    const stats = await borrowingRepository.getStats();

    const summary = {
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalFines: stat.totalFines,
        };
        return acc;
      }, {}),
    };

    const unpaidFinesTotal = await borrowingRepository.count({
      fineAmount: { $gt: 0 },
      finePaid: false,
    });

    return {
      ...summary,
      unpaidFinesCount: unpaidFinesTotal,
    };
  },

  /**
   * Get user's borrowing statistics
   */
  async getUserBorrowingStats(userId) {
    const stats = await borrowingRepository.findByUser(userId);

    const activeBorrowings = stats.filter((b) => b.status === "active").length;
    const returnedBooks = stats.filter((b) => b.status === "returned").length;
    const overdueBooks = stats.filter((b) => b.status === "overdue").length;
    const totalFineAmount = stats.reduce((sum, b) => sum + b.fineAmount, 0);
    const paidFines = stats.filter((b) => b.finePaid && b.fineAmount > 0).length;

    return {
      activeBorrowings,
      returnedBooks,
      overdueBooks,
      totalFineAmount,
      unpaidFines: totalFineAmount > 0 ? paidFines : 0,
    };
  },

  /**
   * Format borrowing response with calculated fields
   */
  /**
   * Issue book via QR code scan (Admin feature)
   * @param {String} qrCode - QR code value from scanned book
   * @param {String} userId - User ID to issue the book to
   * @returns {Promise<Object>} Created borrowing record
   */
  async issueBookByQRCode(qrCode, userId) {
    try {
      // Validate QR code
      if (!qrCode || typeof qrCode !== "string" || qrCode.trim() === "") {
        throw new Error("Valid QR code is required");
      }

      // Validate user ID
      if (!userId || typeof userId !== "string") {
        throw new Error("Valid user ID is required");
      }

      // Find book by QR code
      const book = await Book.findOne({ qrCode: qrCode.trim() });
      if (!book) {
        throw new Error("Book not found with provided QR code");
      }

      // Check book availability
      if (book.availableQuantity < 1) {
        throw new Error(
          `Book "${book.title}" is not available for borrowing. Available copies: ${book.availableQuantity}`
        );
      }

      if (book.status !== "available") {
        throw new Error(`Book "${book.title}" is currently ${book.status}`);
      }

      // Validate user exists and is active
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Optional: Check if user account is active (if you have a status field)
      // if (user.status === 'inactive') {
      //   throw new Error("User account is inactive");
      // }

      // Check user's active borrowings limit
      const activeBorrowings = await borrowingRepository.findActiveBorrowings(
        userId
      );
      if (activeBorrowings.length >= 5) {
        throw new Error(
          `User has reached the maximum borrowing limit (5 books). Current active: ${activeBorrowings.length}`
        );
      }

      // Check if user already has this book borrowed
      const existingBorrow = activeBorrowings.find(
        (b) => b.book._id.toString() === book._id.toString()
      );
      if (existingBorrow) {
        throw new Error(
          `User already has "${book.title}" borrowed. Due date: ${existingBorrow.dueDate.toLocaleDateString()}`
        );
      }

      // Calculate due date (default 14 days)
      const borrowDate = new Date();
      const dueDate = new Date(borrowDate);
      dueDate.setDate(dueDate.getDate() + 14); // Default 14 days

      // Create borrowing record
      const borrowingData = {
        user: userId,
        book: book._id,
        borrowDate,
        dueDate,
        status: "active",
        notes: `Issued via QR code scan: ${qrCode}`,
      };

      const borrowing = await borrowingRepository.create(borrowingData);

      // Decrease book availability
      await Book.findByIdAndUpdate(book._id, {
        $inc: { availableQuantity: -1 },
      });

      // Update book status if out of stock
      if (book.availableQuantity - 1 === 0) {
        await Book.findByIdAndUpdate(book._id, {
          status: "out-of-stock",
        });
      }

      // Fetch complete borrowing record with populated fields
      const completeBorrowing = await borrowingRepository.findById(
        borrowing._id
      );

      return {
        success: true,
        message: `Book "${book.title}" successfully issued to ${user.username}`,
        borrowing: completeBorrowing,
        bookDetails: {
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          qrCode: book.qrCode,
        },
        userDetails: {
          username: user.username,
          email: user.email,
        },
        dueDate: dueDate.toLocaleDateString(),
        remainingCopies: book.availableQuantity - 1,
      };
    } catch (error) {
      throw new Error(`QR code scan failed: ${error.message}`);
    }
  },

  formatBorrowingResponse(borrowing) {
    const now = new Date();
    const daysOverdue =
      borrowing.status === "active" && now > borrowing.dueDate
        ? this.calculateDaysOverdue(borrowing.dueDate, now)
        : 0;

    const estimatedFine = daysOverdue > 0 ? daysOverdue * FINE_RATE_PER_DAY : 0;

    return {
      ...borrowing.toObject(),
      daysOverdue,
      estimatedFine,
      isOverdue: borrowing.status === "active" && now > borrowing.dueDate,
      daysRemaining:
        borrowing.status === "active"
          ? Math.ceil((borrowing.dueDate - now) / (1000 * 60 * 60 * 24))
          : 0,
    };
  },
};
