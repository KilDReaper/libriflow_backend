import { reservationRepository } from "./reservation.repository.js";
import Book from "../../models/book.model.js";
import User from "../../models/user.model.js";

export const reservationService = {

  async createReservation(userId, bookId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const book = await Book.findById(bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    if (book.status === "discontinued") {
      throw new Error("This book is no longer available for reservation");
    }

    const existingReservation = await reservationRepository.findActiveByUserAndBook(
      userId,
      bookId
    );

    if (existingReservation) {
      throw new Error(
        `You already have an ${existingReservation.status} reservation for this book`
      );
    }

    const isAvailable = book.availableQuantity > 0;

    let reservationData = {
      user: userId,
      book: bookId,
      status: isAvailable ? "approved" : "pending",
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
    };

    if (isAvailable) {
      reservationData.approvedAt = new Date();
      reservationData.queuePosition = null;

      await Book.findByIdAndUpdate(bookId, {
        $inc: { availableQuantity: -1 },
      });
    } else {
      const maxQueuePosition = await reservationRepository.getMaxQueuePosition(bookId);
      reservationData.queuePosition = maxQueuePosition + 1;
    }

    const reservation = await reservationRepository.create(reservationData);

    return await reservationRepository.findById(reservation._id);
  },

  async getUserReservations(userId, query) {
    const { page = 1, limit = 10, status } = query;

    const reservations = await reservationRepository.findByUser(userId, {
      page,
      limit,
      status,
    });

    const total = await reservationRepository.countByUser(userId, status ? { status } : {});

    return {
      reservations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    };
  },

  async getAllReservations(query) {
    const { page = 1, limit = 10, status, userId, bookId } = query;

    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.user = userId;
    if (bookId) filter.book = bookId;

    const reservations = await reservationRepository.findAll(filter, { page, limit });
    const total = await reservationRepository.count(filter);

    return {
      reservations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    };
  },

  async getReservationById(id, userId, isAdmin) {
    const reservation = await reservationRepository.findById(id);

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (!isAdmin && reservation.user._id.toString() !== userId) {
      throw new Error("Not authorized to view this reservation");
    }

    return reservation;
  },

  async getBookReservations(bookId, query) {
    const { page = 1, limit = 10, status } = query;

    const reservations = await reservationRepository.findByBook(bookId, {
      page,
      limit,
      status,
    });

    const total = await reservationRepository.count({
      book: bookId,
      ...(status && { status }),
    });

    return {
      reservations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    };
  },

  async cancelReservation(id, userId, isAdmin) {
    const reservation = await reservationRepository.findById(id);

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Check authorization
    if (!isAdmin && reservation.user._id.toString() !== userId) {
      throw new Error("Not authorized to cancel this reservation");
    }

    // Check if reservation can be cancelled
    if (reservation.status === "cancelled") {
      throw new Error("Reservation is already cancelled");
    }

    if (reservation.status === "completed") {
      throw new Error("Cannot cancel a completed reservation");
    }

    if (reservation.status === "expired") {
      throw new Error("Cannot cancel an expired reservation");
    }

    const wasApproved = reservation.status === "approved";
    const oldQueuePosition = reservation.queuePosition;

    // Update reservation status
    const updatedReservation = await reservationRepository.update(id, {
      status: "cancelled",
      cancelledAt: new Date(),
    });

    // If reservation was approved, restore book quantity
    if (wasApproved) {
      await Book.findByIdAndUpdate(reservation.book._id, {
        $inc: { availableQuantity: 1 },
      });

      // Check if there are pending reservations and approve the first one
      await this.processNextInQueue(reservation.book._id);
    }

    // If reservation was pending, reorder the queue
    if (reservation.status === "pending" && oldQueuePosition) {
      await reservationRepository.reorderQueue(reservation.book._id, oldQueuePosition);
    }

    return updatedReservation;
  },

  /**
   * Complete a reservation (mark as collected)
   */
  async completeReservation(id) {
    const reservation = await reservationRepository.findById(id);

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (reservation.status !== "approved") {
      throw new Error("Only approved reservations can be completed");
    }

    const updatedReservation = await reservationRepository.update(id, {
      status: "completed",
      completedAt: new Date(),
    });

    // Check if there are pending reservations and approve the first one
    await this.processNextInQueue(reservation.book._id);

    return updatedReservation;
  },

  /**
   * Process next reservation in queue
   * If book becomes available, approve the first pending reservation
   */
  async processNextInQueue(bookId) {
    const book = await Book.findById(bookId);

    if (!book || book.availableQuantity <= 0) {
      return null;
    }

    // Find the first pending reservation
    const queue = await reservationRepository.findQueueForBook(bookId);
    const nextReservation = queue.find((r) => r.status === "pending");

    if (!nextReservation) {
      return null;
    }

    // Get old queue position before updating
    const oldQueuePosition = nextReservation.queuePosition;

    // Approve the reservation
    const approved = await reservationRepository.update(nextReservation._id, {
      status: "approved",
      approvedAt: new Date(),
      queuePosition: null,
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Reset expiration
    });

    // Decrease available quantity
    await Book.findByIdAndUpdate(bookId, {
      $inc: { availableQuantity: -1 },
    });

    // Reorder remaining queue
    if (oldQueuePosition) {
      await reservationRepository.reorderQueue(bookId, oldQueuePosition);
    }

    return approved;
  },

  /**
   * Check and expire old reservations
   * This should be run periodically (e.g., via cron job)
   */
  async expireOldReservations() {
    const expiredReservations = await reservationRepository.findExpired();

    const results = {
      expired: 0,
      processed: [],
    };

    for (const reservation of expiredReservations) {
      try {
        const wasApproved = reservation.status === "approved";

        // Update reservation to expired
        await reservationRepository.update(reservation._id, {
          status: "expired",
        });

        // If it was approved, restore book quantity and process next in queue
        if (wasApproved) {
          await Book.findByIdAndUpdate(reservation.book._id, {
            $inc: { availableQuantity: 1 },
          });

          await this.processNextInQueue(reservation.book._id);
        } else if (reservation.queuePosition) {
          // If it was pending, reorder queue
          await reservationRepository.reorderQueue(
            reservation.book._id,
            reservation.queuePosition
          );
        }

        results.expired++;
        results.processed.push(reservation._id);
      } catch (error) {
        console.error(`Error expiring reservation ${reservation._id}:`, error.message);
      }
    }

    return results;
  },

  /**
   * Get queue status for a book
   */
  async getQueueStatus(bookId) {
    const book = await Book.findById(bookId);

    if (!book) {
      throw new Error("Book not found");
    }

    const queue = await reservationRepository.findQueueForBook(bookId);

    const pending = queue.filter((r) => r.status === "pending");
    const approved = queue.filter((r) => r.status === "approved");

    return {
      book: {
        id: book._id,
        title: book.title,
        availableQuantity: book.availableQuantity,
      },
      queueLength: pending.length,
      approvedCount: approved.length,
      queue: queue.map((r) => ({
        id: r._id,
        user: r.user,
        status: r.status,
        queuePosition: r.queuePosition,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
      })),
    };
  },
};
