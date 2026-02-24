import Payment from "../../models/payment.model.js";

export const paymentRepository = {
  /**
   * Create a new payment
   */
  create: (data) => Payment.create(data),

  /**
   * Find payment by ID
   */
  findById: (id) =>
    Payment.findById(id)
      .populate("user", "username email phoneNumber")
      .populate("borrowing", "book dueDate returnedDate fineAmount"),

  /**
   * Find payment by transaction ID
   */
  findByTransactionId: (transactionId) => Payment.findOne({ transactionId }),

  /**
   * Find payment by external transaction ID
   */
  findByExternalTransactionId: (externalTransactionId) =>
    Payment.findOne({ externalTransactionId }),

  /**
   * Find all payments with filters
   */
  findAll: (filter = {}, options = {}) => {
    const { page = 1, limit = 10, sort = "-createdAt" } = options;
    const skip = (page - 1) * limit;

    return Payment.find(filter)
      .populate("user", "username email")
      .populate("borrowing", "book fineAmount")
      .sort(sort)
      .skip(skip)
      .limit(limit);
  },

  /**
   * Find payments by user
   */
  findByUser: (userId, options = {}) => {
    const { page = 1, limit = 10, status } = options;
    const skip = (page - 1) * limit;

    const filter = { user: userId };
    if (status) filter.paymentStatus = status;

    return Payment.find(filter)
      .populate("borrowing", "book fineAmount")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);
  },

  /**
   * Find payments by borrowing
   */
  findByBorrowing: (borrowingId) =>
    Payment.findOne({ borrowing: borrowingId }).populate("user", "username email"),

  /**
   * Count payments with filter
   */
  count: (filter = {}) => Payment.countDocuments(filter),

  /**
   * Count payments by user
   */
  countByUser: (userId, filter = {}) =>
    Payment.countDocuments({ user: userId, ...filter }),

  /**
   * Update payment by ID
   */
  update: (id, data) =>
    Payment.findByIdAndUpdate(id, data, { new: true })
      .populate("user", "username email phoneNumber")
      .populate("borrowing", "book dueDate returnedDate fineAmount"),

  /**
   * Find pending payments for borrowing
   */
  findPendingByBorrowing: (borrowingId) =>
    Payment.findOne({ borrowing: borrowingId, paymentStatus: "pending" }),

  /**
   * Find all pending payments
   */
  findAllPending: (options = {}) => {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return Payment.find({ paymentStatus: "pending" })
      .populate("user", "username email")
      .populate("borrowing", "book fineAmount")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);
  },

  /**
   * Get payment statistics
   */
  getStats: async (filter = {}) => {
    return Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$paymentStatus",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);
  },

  /**
   * Get user's payment statistics
   */
  getUserStats: async (userId) => {
    return Payment.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$paymentStatus",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);
  },

  /**
   * Find payments by payment method
   */
  findByPaymentMethod: (method, options = {}) => {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    return Payment.find({ paymentMethod: method })
      .populate("user", "username email")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);
  },
};
