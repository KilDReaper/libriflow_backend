/**
 * Cleanup Script: Remove duplicate and invalid book entries
 * Run this to clean up books with null/empty ISBN values
 * 
 * Usage: node src/scripts/cleanupBooks.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Book from "../models/book.model.js";

dotenv.config();

const cleanupBooks = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/libriflow");

    console.log("🗑️  Starting book cleanup...");

    // Find and delete books with null or empty ISBN that are from google_books
    const result = await Book.deleteMany({
      $or: [
        { isbn: null },
        { isbn: "" },
        { isbn: undefined }
      ],
      source: "google_books"
    });

    console.log(`✅ Deleted ${result.deletedCount} duplicate external book entries`);

    // Find and remove null/empty ISBNs from other books (shouldn't happen but just in case)
    const updateResult = await Book.updateMany(
      { isbn: { $in: [null, ""] } },
      { $set: { isbn: Math.random().toString(36).substr(2, 9) } }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} books with invalid ISBN`);

    // Verify unique index on ISBN
    const indexes = await Book.collection.getIndexes();
    console.log("📊 Current indexes:", Object.keys(indexes));

    console.log("✨ Cleanup completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
    process.exit(1);
  }
};

cleanupBooks();
