import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "cancelled", "completed", "expired"],
      default: "pending",
    },
    queuePosition: {
      type: Number,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    approvedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure a user can't reserve the same book multiple times when active
reservationSchema.index({ user: 1, book: 1, status: 1 });

// Index for queue management
reservationSchema.index({ book: 1, status: 1, queuePosition: 1 });

// Index for finding expired reservations
reservationSchema.index({ expiresAt: 1, status: 1 });

// Virtual to check if reservation is expired
reservationSchema.virtual("isExpired").get(function () {
  return this.expiresAt < new Date() && (this.status === "pending" || this.status === "approved");
});

// Pre-save middleware to set expiration date
reservationSchema.pre("save", function (next) {
  if (this.isNew && !this.expiresAt) {
    // Set expiration to 2 days from now
    this.expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  }
  next();
});

export default mongoose.model("Reservation", reservationSchema);
