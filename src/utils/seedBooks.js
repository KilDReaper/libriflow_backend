// src/utils/seedBooks.js
// Run this script to seed sample books into your database
// Usage: node src/utils/seedBooks.js

import mongoose from "mongoose";
import Book from "../models/book.model.js";
import "dotenv/config";

const sampleBooks = [
  {
    title: "Clean Code: A Handbook of Agile Software Craftsmanship",
    author: "Robert C. Martin",
    isbn: "978-0132350884",
    publisher: "Prentice Hall",
    publishedDate: new Date("2008-08-01"),
    genre: ["Technology", "Non-Fiction"],
    description: "Even bad code can function. But if code isn't clean, it can bring a development organization to its knees.",
    price: 47.99,
    stockQuantity: 5,
    availableQuantity: 5,
    language: "English",
    pages: 464,
    rating: 4.7,
    totalReviews: 0,
    status: "available",
  },
  {
    title: "The Pragmatic Programmer",
    author: "David Thomas, Andrew Hunt",
    isbn: "978-0135957059",
    publisher: "Addison-Wesley",
    publishedDate: new Date("2019-09-13"),
    genre: ["Technology", "Non-Fiction"],
    description: "The Pragmatic Programmer is one of those rare tech books you'll read, re-read, and read again over the years.",
    price: 41.99,
    stockQuantity: 3,
    availableQuantity: 3,
    language: "English",
    pages: 352,
    rating: 4.8,
    totalReviews: 0,
    status: "available",
  },
  {
    title: "Design Patterns: Elements of Reusable Object-Oriented Software",
    author: "Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides",
    isbn: "978-0201633610",
    publisher: "Addison-Wesley",
    publishedDate: new Date("1994-10-31"),
    genre: ["Technology", "Non-Fiction"],
    description: "Capturing a wealth of experience about the design of object-oriented software, four top-notch designers present a catalog of simple and succinct solutions to commonly occurring design problems.",
    price: 54.99,
    stockQuantity: 2,
    availableQuantity: 2,
    language: "English",
    pages: 416,
    rating: 4.6,
    totalReviews: 0,
    status: "available",
  },
  {
    title: "JavaScript: The Good Parts",
    author: "Douglas Crockford",
    isbn: "978-0596517748",
    publisher: "O'Reilly Media",
    publishedDate: new Date("2008-05-08"),
    genre: ["Technology", "Non-Fiction"],
    description: "Most programming languages contain good and bad parts, but JavaScript has more than its share of the bad.",
    price: 29.99,
    stockQuantity: 4,
    availableQuantity: 4,
    language: "English",
    pages: 176,
    rating: 4.5,
    totalReviews: 0,
    status: "available",
  },
  {
    title: "You Don't Know JS: Scope & Closures",
    author: "Kyle Simpson",
    isbn: "978-1449335588",
    publisher: "O'Reilly Media",
    publishedDate: new Date("2014-03-24"),
    genre: ["Technology", "Non-Fiction"],
    description: "No matter how much experience you have with JavaScript, odds are you don't fully understand the language.",
    price: 19.99,
    stockQuantity: 0,
    availableQuantity: 0,
    language: "English",
    pages: 98,
    rating: 4.7,
    totalReviews: 0,
    status: "out-of-stock",
  },
  {
    title: "Eloquent JavaScript",
    author: "Marijn Haverbeke",
    isbn: "978-1593279509",
    publisher: "No Starch Press",
    publishedDate: new Date("2018-12-04"),
    genre: ["Technology", "Non-Fiction"],
    description: "JavaScript lies at the heart of almost every modern web application. This book provides an overview of this language.",
    price: 39.95,
    stockQuantity: 6,
    availableQuantity: 6,
    language: "English",
    pages: 472,
    rating: 4.6,
    totalReviews: 0,
    status: "available",
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    isbn: "978-0735211292",
    publisher: "Avery",
    publishedDate: new Date("2018-10-16"),
    genre: ["Self-Help", "Non-Fiction"],
    description: "An Easy & Proven Way to Build Good Habits & Break Bad Ones",
    price: 27.00,
    stockQuantity: 8,
    availableQuantity: 8,
    language: "English",
    pages: 320,
    rating: 4.8,
    totalReviews: 0,
    status: "available",
  },
  {
    title: "The Lean Startup",
    author: "Eric Ries",
    isbn: "978-0307887894",
    publisher: "Crown Business",
    publishedDate: new Date("2011-09-13"),
    genre: ["Business", "Non-Fiction"],
    description: "How Today's Entrepreneurs Use Continuous Innovation to Create Radically Successful Businesses",
    price: 26.00,
    stockQuantity: 3,
    availableQuantity: 3,
    language: "English",
    pages: 336,
    rating: 4.5,
    totalReviews: 0,
    status: "available",
  },
];

const seedBooks = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing books (optional)
    // await Book.deleteMany({});
    // console.log("🗑️  Cleared existing books");

    // Insert sample books
    const books = await Book.insertMany(sampleBooks);
    console.log(`✅ Successfully seeded ${books.length} books`);

    // Display inserted books
    books.forEach((book, index) => {
      console.log(`\n${index + 1}. ${book.title}`);
      console.log(`   ID: ${book._id}`);
      console.log(`   ISBN: ${book.isbn}`);
      console.log(`   Available: ${book.availableQuantity}/${book.stockQuantity}`);
      console.log(`   Status: ${book.status}`);
    });

    console.log("\n✅ Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding books:", error.message);
    process.exit(1);
  }
};

seedBooks();
