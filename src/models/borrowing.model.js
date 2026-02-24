import mongoose from "mongoose";

const borrowingSchema = new mongoose.Schema(
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
    borrowDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    returnedDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "returned", "overdue", "lost"],
      default: "active",
    },
    fineAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finePaid: {
      type: Boolean,
      default: false,
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

// Index for finding user's active borrows
borrowingSchema.index({ user: 1, status: 1 });

// Index for finding overdue books
borrowingSchema.index({ dueDate: 1, status: 1 });

// Index for finding unpaid fines
borrowingSchema.index({ user: 1, fineAmount: 1, finePaid: 1 });

export default mongoose.model("Borrowing", borrowingSchema);
