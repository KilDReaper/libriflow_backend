import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    borrowing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Borrowing",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "success", "failed", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["khalti", "esewa", "stripe", "cash"],
      required: true,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    externalTransactionId: {
      type: String,
      default: null,
      trim: true,
    },
    paymentGatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    description: {
      type: String,
      default: "Fine payment for borrowed book",
      trim: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for quick lookups
paymentSchema.index({ user: 1, paymentStatus: 1 });
paymentSchema.index({ borrowing: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ externalTransactionId: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual to check if payment is pending
paymentSchema.virtual("isPending").get(function () {
  return this.paymentStatus === "pending";
});

export default mongoose.model("Payment", paymentSchema);
