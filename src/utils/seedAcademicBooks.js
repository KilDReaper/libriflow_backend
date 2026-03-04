// src/utils/seedAcademicBooks.js
// Add academic books to the database
import mongoose from "mongoose";
import Book from "../models/book.model.js";
import "dotenv/config";

const academicBooks = [
  {
    title: "Concepts of Physics Vol 1",
    author: "H.C. Verma",
    isbn: "978-8177091878",
    publisher: "Bharati Bhawan",
    publishedDate: new Date("2008-01-01"),
    genre: ["Physics", "Science", "Academic"],
    description: "This is the first volume of HC Verma's Concepts of Physics series. It covers mechanics, waves, and thermodynamics.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9788177091878-L.jpg",
    price: 25.99,
    stockQuantity: 10,
    availableQuantity: 10,
    language: "English",
    pages: 462,
    rating: 4.8,
    totalReviews: 0,
    status: "available",
  },
  {
    title: "Concepts of Physics Vol 2",
    author: "H.C. Verma",
    isbn: "978-8177093315",
    publisher: "Bharati Bhawan",
    publishedDate: new Date("2008-01-01"),
    genre: ["Physics", "Science", "Academic"],
    description: "Volume 2 covers optics, electromagnetism, and modern physics concepts.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9788177093315-L.jpg",
    price: 25.99,
    stockQuantity: 10,
    availableQuantity: 10,
    language: "English",
    pages: 483,
    rating: 4.8,
    totalReviews: 0,
    status: "available",
  },
  {
    title: "Organic Chemistry",
    author: "Morrison and Boyd",
    isbn: "978-8131704815",
    publisher: "Pearson",
    publishedDate: new Date("2010-06-01"),
    genre: ["Chemistry", "Science", "Academic"],
    description: "Comprehensive guide to organic chemistry with detailed mechanisms and reactions.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9788131704815-L.jpg",
    price: 45.99,
    stockQuantity: 8,
    availableQuantity: 8,
    language: "English",
    pages: 1283,
    rating: 4.6,
    totalReviews: 0,
    status: "available",
  },
  {
    title: "Mathematics for Class 12",
    author: "R.D. Sharma",
    isbn: "978-9352533893",
    publisher: "Dhanpat Rai Publications",
    publishedDate: new Date("2018-04-01"),
    genre: ["Mathematics", "Academic"],
    description: "Complete mathematics textbook for class 12 with solved examples and practice problems.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9789352533893-L.jpg",
    price: 35.99,
    stockQuantity: 12,
    availableQuantity: 12,
    language: "English",
    pages: 1456,
    rating: 4.7,
    totalReviews: 0,
    status: "available",
  },
  {
    title: "NCERT Physics Class 11",
    author: "NCERT",
    isbn: "978-8174506870",
    publisher: "NCERT",
    publishedDate: new Date("2020-01-01"),
    genre: ["Physics", "Science", "Academic"],
    description: "Official NCERT textbook for Class 11 Physics covering all fundamental concepts.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9788174506870-L.jpg",
    price: 15.99,
    stockQuantity: 15,
    availableQuantity: 15,
    language: "English",
    pages: 386,
    rating: 4.5,
    totalReviews: 0,
    status: "available",
  },
  {
    title: "NCERT Chemistry Class 12",
    author: "NCERT",
    isbn: "978-8174507327",
    publisher: "NCERT",
    publishedDate: new Date("2020-01-01"),
    genre: ["Chemistry", "Science", "Academic"],
    description: "Official NCERT textbook for Class 12 Chemistry with comprehensive coverage.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9788174507327-L.jpg",
    price: 15.99,
    stockQuantity: 15,
    availableQuantity: 15,
    language: "English",
    pages: 398,
    rating: 4.5,
    totalReviews: 0,
    status: "available",
  },
  {
    title: "Fundamentals of Computer Science Class 11",
    author: "Sumita Arora",
    isbn: "978-8183332194",
    publisher: "Dhanpat Rai",
    publishedDate: new Date("2019-04-01"),
    genre: ["Computer Science", "Technology", "Academic"],
    description: "Complete textbook for Class 11 Computer Science with Python programming.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9788183332194-L.jpg",
    price: 29.99,
    stockQuantity: 10,
    availableQuantity: 10,
    language: "English",
    pages: 568,
    rating: 4.6,
    totalReviews: 0,
    status: "available",
  },
  {
    title: "English Core Class 12",
    author: "Flamingo and Vistas",
    isbn: "978-8174508140",
    publisher: "NCERT",
    publishedDate: new Date("2020-01-01"),
    genre: ["English", "Literature", "Academic"],
    description: "NCERT English Core textbook for Class 12 with prose and poetry selections.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9788174508140-L.jpg",
    price: 12.99,
    stockQuantity: 20,
    availableQuantity: 20,
    language: "English",
    pages: 256,
    rating: 4.4,
    totalReviews: 0,
    status: "available",
  },
  {
    title: "Introduction to Algorithms",
    author: "Cormen, Leiserson, Rivest, Stein",
    isbn: "978-0262033848",
    publisher: "MIT Press",
    publishedDate: new Date("2009-07-31"),
    genre: ["Computer Science", "Technology", "Academic"],
    description: "The definitive guide to algorithms, widely used in computer science education.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780262033848-L.jpg",
    price: 89.99,
    stockQuantity: 5,
    availableQuantity: 5,
    language: "English",
    pages: 1312,
    rating: 4.9,
    totalReviews: 0,
    status: "available",
  },
  {
    title: "Biology Campbell Edition",
    author: "Neil Campbell, Jane Reece",
    isbn: "978-0321775658",
    publisher: "Pearson",
    publishedDate: new Date("2013-01-03"),
    genre: ["Biology", "Science", "Academic"],
    description: "Comprehensive biology textbook covering all major topics in modern biology.",
    coverImageUrl: "https://covers.openlibrary.org/b/isbn/9780321775658-L.jpg",
    price: 95.99,
    stockQuantity: 6,
    availableQuantity: 6,
    language: "English",
    pages: 1464,
    rating: 4.7,
    totalReviews: 0,
    status: "available",
  },
];

const seedAcademicBooks = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Insert academic books
    const books = await Book.insertMany(academicBooks);
    console.log(`✅ Successfully seeded ${books.length} academic books`);

    // Display inserted books
    books.forEach((book, index) => {
      console.log(`\n${index + 1}. ${book.title}`);
      console.log(`   Genres: ${book.genre.join(", ")}`);
      console.log(`   Available: ${book.availableQuantity}/${book.stockQuantity}`);
    });

    console.log("\n✅ Academic books seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding academic books:", error.message);
    process.exit(1);
  }
};

seedAcademicBooks();
