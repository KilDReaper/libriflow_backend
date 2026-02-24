import Reservation from "../../models/reservation.model.js";

export const reservationRepository = {
  /**
   * Create a new reservation
   */
  create: (data) => Reservation.create(data),

  /**
   * Find all reservations with filters and pagination
   */
  findAll: (filter = {}, options = {}) => {
    const { page = 1, limit = 10, sort = "-createdAt" } = options;
    const skip = (page - 1) * limit;

    return Reservation.find(filter)
      .populate("user", "username email phoneNumber")
      .populate("book", "title author isbn coverImageUrl availableQuantity")
      .sort(sort)
      .skip(skip)
      .limit(limit);
  },

  /**
   * Find reservation by ID
   */
  findById: (id) =>
    Reservation.findById(id)
      .populate("user", "username email phoneNumber")
      .populate("book", "title author isbn coverImageUrl availableQuantity"),

  /**
   * Find reservations by user
   */
  findByUser: (userId, options = {}) => {
    const { page = 1, limit = 10, status } = options;
    const skip = (page - 1) * limit;

    const filter = { user: userId };
    if (status) filter.status = status;

    return Reservation.find(filter)
      .populate("book", "title author isbn coverImageUrl availableQuantity")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);
  },

  /**
   * Find reservations by book
   */
  findByBook: (bookId, options = {}) => {
    const { page = 1, limit = 10, status } = options;
    const skip = (page - 1) * limit;

    const filter = { book: bookId };
    if (status) filter.status = status;

    return Reservation.find(filter)
      .populate("user", "username email")
      .sort("queuePosition")
      .skip(skip)
      .limit(limit);
  },

  /**
   * Find active reservation by user and book
   */
  findActiveByUserAndBook: (userId, bookId) => {
    return Reservation.findOne({
      user: userId,
      book: bookId,
      status: { $in: ["pending", "approved"] },
    });
  },

  /**
   * Find pending/approved reservations for a book ordered by queue position
   */
  findQueueForBook: (bookId) => {
    return Reservation.find({
      book: bookId,
      status: { $in: ["pending", "approved"] },
    })
      .populate("user", "username email")
      .sort("queuePosition createdAt");
  },

  /**
   * Count reservations with filter
   */
  count: (filter = {}) => Reservation.countDocuments(filter),

  /**
   * Count reservations by user
   */
  countByUser: (userId, filter = {}) =>
    Reservation.countDocuments({ user: userId, ...filter }),

  /**
   * Update reservation by ID
   */
  update: (id, data) => Reservation.findByIdAndUpdate(id, data, { new: true })
    .populate("user", "username email phoneNumber")
    .populate("book", "title author isbn coverImageUrl availableQuantity"),

  /**
   * Delete reservation by ID
   */
  delete: (id) => Reservation.findByIdAndDelete(id),

  /**
   * Find expired reservations
   */
  findExpired: () => {
    return Reservation.find({
      status: { $in: ["pending", "approved"] },
      expiresAt: { $lt: new Date() },
    }).populate("book", "title availableQuantity");
  },

  /**
   * Get highest queue position for a book
   */
  getMaxQueuePosition: async (bookId) => {
    const result = await Reservation.findOne({
      book: bookId,
      status: { $in: ["pending", "approved"] },
    })
      .sort("-queuePosition")
      .select("queuePosition");

    return result ? result.queuePosition : 0;
  },

  /**
   * Update queue positions after cancellation/completion
   */
  reorderQueue: async (bookId, fromPosition) => {
    return Reservation.updateMany(
      {
        book: bookId,
        status: "pending",
        queuePosition: { $gt: fromPosition },
      },
      {
        $inc: { queuePosition: -1 },
      }
    );
  },

  /**
   * Bulk update reservations
   */
  bulkUpdate: (filter, update) => {
    return Reservation.updateMany(filter, update);
  },
};
