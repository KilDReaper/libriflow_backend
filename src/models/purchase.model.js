import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
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
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    purchaseType: {
      type: String,
      enum: ["buy", "rent"],
      default: "buy",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    rentalDays: {
      type: Number,
      default: null,
    },
    returnDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "returned", "cancelled"],
      default: "active",
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

// Indexes for quick lookups
purchaseSchema.index({ user: 1, purchaseDate: -1 });
purchaseSchema.index({ book: 1 });
purchaseSchema.index({ user: 1, status: 1 });

export default mongoose.model("Purchase", purchaseSchema);
