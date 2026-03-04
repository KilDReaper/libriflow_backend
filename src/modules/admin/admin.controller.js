import User from "../../models/user.model.js";
import Book from "../../models/book.model.js";

export const createUser = async (req, res) => {
  try {
    const data = { ...req.body };

    if (req.file) {
      data.avatarUrl = `${req.protocol}://${req.get("host")}/uploads/users/${req.file.filename}`;
    }

    const user = await User.create(data);
    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json({ success: true, users });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (req.file) {
      updates.avatarUrl = `${req.protocol}://${req.get("host")}/uploads/users/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Book Management
export const createBook = async (req, res) => {
  try {
    console.log("Creating book with data:", req.body);
    
    const { 
      title, 
      author, 
      isbn, 
      publisher, 
      publishedDate, 
      publishedYear,
      genre, 
      category,
      description, 
      coverImageUrl, 
      stockQuantity,
      totalCopies,
      price 
    } = req.body;

    // Handle different field name conventions
    const finalStockQuantity = stockQuantity || totalCopies;
    const finalGenre = genre || category;
    const finalPublishedDate = publishedDate || publishedYear;

    // Validate required fields
    if (!title || !author || !isbn || finalStockQuantity === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: title, author, isbn, and totalCopies/stockQuantity" 
      });
    }

    // Handle uploaded cover image or use provided URL
    let finalCoverImageUrl = coverImageUrl || "";
    if (req.file) {
      finalCoverImageUrl = `${req.protocol}://${req.get("host")}/uploads/books/${req.file.filename}`;
    }

    const bookData = {
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim(),
      publisher: publisher ? publisher.trim() : "",
      publishedDate: finalPublishedDate ? new Date(finalPublishedDate) : undefined,
      genre: finalGenre ? (Array.isArray(finalGenre) ? finalGenre : [finalGenre]) : ["Other"],
      description: description ? description.trim() : "",
      coverImageUrl: finalCoverImageUrl,
      stockQuantity: parseInt(finalStockQuantity),
      availableQuantity: parseInt(finalStockQuantity),
      price: price ? parseFloat(price) : 0,
    };

    const book = await Book.create(bookData);
    res.status(201).json({ success: true, book });
  } catch (err) {
    console.error("Error creating book:", err);
    res.status(400).json({ 
      success: false, 
      message: err.message || "Failed to create book"
    });
  }
};

export const getBooks = async (req, res) => {
  try {
    const books = await Book.find();
    res.json({ success: true, books });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getInventoryStats = async (req, res) => {
  try {
    const books = await Book.find();
    
    const stats = {
      totalBooks: books.length,
      totalCopies: books.reduce((sum, book) => sum + book.stockQuantity, 0),
      availableCopies: books.reduce((sum, book) => sum + book.availableQuantity, 0),
      borrowedCopies: books.reduce((sum, book) => sum + (book.stockQuantity - book.availableQuantity), 0),
    };
    
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const searchBooks = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ success: false, message: "Search query is required" });
    }
    
    const searchRegex = new RegExp(q, "i");
    
    const books = await Book.find({
      $or: [
        { title: searchRegex },
        { author: searchRegex },
        { isbn: searchRegex },
        { genre: searchRegex },
        { publisher: searchRegex },
      ],
    });
    
    res.json({ success: true, data: books });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: "Book not found" });
    res.json({ success: true, book });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateBook = async (req, res) => {
  try {
    const allowedUpdates = ["title", "author", "publisher", "publishedDate", "genre", "description", "coverImageUrl", "price", "stockQuantity", "availableQuantity", "language", "pages", "status"];
    const updates = {};

    // Handle uploaded cover image
    if (req.file) {
      updates.coverImageUrl = `${req.protocol}://${req.get("host")}/uploads/books/${req.file.filename}`;
    }

    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        if (key === "publishedDate" && req.body[key]) {
          updates[key] = new Date(req.body[key]);
        } else if (key === "genre" && req.body[key]) {
          updates[key] = Array.isArray(req.body[key]) ? req.body[key] : [req.body[key]];
        } else if ((key === "stockQuantity" || key === "availableQuantity" || key === "price" || key === "pages") && req.body[key] !== undefined) {
          updates[key] = parseInt(req.body[key]);
        } else {
          updates[key] = req.body[key];
        }
      }
    });

    const book = await Book.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!book) return res.status(404).json({ success: false, message: "Book not found" });
    res.json({ success: true, book });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const deleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: "Book not found" });
    res.json({ success: true, message: "Book deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
