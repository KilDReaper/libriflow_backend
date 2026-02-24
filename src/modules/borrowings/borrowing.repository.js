import Borrowing from "../../models/borrowing.model.js";

export const borrowingRepository = {
  /**
   * Create new borrowing
   */
  create: (data) => Borrowing.create(data),

  /**
   * Find borrowing by ID
   */
  findById: (id) =>
    Borrowing.findById(id)
      .populate("user", "username email phoneNumber")
      .populate("book", "title author isbn coverImageUrl availableQuantity"),

  /**
   * Find all borrowings with filters
   */
  findAll: (filter = {}, options = {}) => {
    const { page = 1, limit = 10, sort = "-createdAt" } = options;
    const skip = (page - 1) * limit;

    return Borrowing.find(filter)
      .populate("user", "username email")
      .populate("book", "title author isbn")
      .sort(sort)
      .skip(skip)
      .limit(limit);
  },

  /**
   * Find borrowings by user
   */
  findByUser: (userId, options = {}) => {
    const { page = 1, limit = 10, status } = options;
    const skip = (page - 1) * limit;

    const filter = { user: userId };
    if (status) filter.status = status;

    return Borrowing.find(filter)
      .populate("book", "title author isbn coverImageUrl availableQuantity")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);
  },

  /**
   * Find active borrowings by user
   */
  findActiveBorrowings: (userId) =>
    Borrowing.find({ user: userId, status: "active" }).populate(
      "book",
      "title author isbn"
    ),

  /**
   * Count borrowings with filter
   */
  count: (filter = {}) => Borrowing.countDocuments(filter),

  /**
   * Count borrowings by user
   */
  countByUser: (userId, filter = {}) =>
    Borrowing.countDocuments({ user: userId, ...filter }),

  /**
   * Update borrowing by ID
   */
  update: (id, data) =>
    Borrowing.findByIdAndUpdate(id, data, { new: true })
      .populate("user", "username email phoneNumber")
      .populate("book", "title author isbn coverImageUrl availableQuantity"),

  /**
   * Find overdue borrowings
   */
  findOverdue: () => {
    return Borrowing.find({
      status: "active",
      dueDate: { $lt: new Date() },
    })
      .populate("user", "username email phoneNumber")
      .populate("book", "title");
  },

  /**
   * Find borrowings with unpaid fines
   */
  findUnpaidFines: (options = {}) => {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return Borrowing.find({
      fineAmount: { $gt: 0 },
      finePaid: false,
    })
      .populate("user", "username email phoneNumber")
      .populate("book", "title")
      .sort("-fineAmount")
      .skip(skip)
      .limit(limit);
  },

  /**
   * Find unpaid fines by user
   */
  findUserUnpaidFines: (userId) =>
    Borrowing.find({
      user: userId,
      fineAmount: { $gt: 0 },
      finePaid: false,
    }).populate("book", "title author isbn"),

  /**
   * Get borrowing statistics
   */
  getStats: async (filter = {}) => {
    return Borrowing.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalFines: { $sum: "$fineAmount" },
        },
      },
    ]);
  },

  /**
   * Delete borrowing
   */
  delete: (id) => Borrowing.findByIdAndDelete(id),
};
