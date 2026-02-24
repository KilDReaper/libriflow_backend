import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    isbn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    qrCode: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
      trim: true,
      index: true, // Fast lookup for QR scanning
    },
    publisher: {
      type: String,
      trim: true,
    },
    publishedDate: {
      type: Date,
    },
    genre: {
      type: [String],
      enum: [
        "Fiction",
        "Non-Fiction",
        "Science",
        "History",
        "Biography",
        "Mystery",
        "Romance",
        "Fantasy",
        "Thriller",
        "Self-Help",
        "Technology",
        "Business",
        "Other",
      ],
      default: ["Other"],
    },
    description: {
      type: String,
    },
    coverImageUrl: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stockQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    availableQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    language: {
      type: String,
      default: "English",
    },
    pages: {
      type: Number,
      min: 1,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["available", "out-of-stock", "discontinued"],
      default: "available",
    },
  },
  {
    timestamps: true,
  }
);

// Text index for search functionality
bookSchema.index({ title: "text", author: "text", isbn: "text" });

export default mongoose.model("Book", bookSchema);
