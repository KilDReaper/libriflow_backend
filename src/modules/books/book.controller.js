import Book from "../../models/book.model.js";

/**
 * Get all books (public endpoint - no auth required)
 */
export const getAllBooks = async (req, res) => {
  try {
    const { limit = 20, page = 1, search, genre, sort = "-createdAt" } = req.query;

    const query = {};

    // Search by title, author, or ISBN
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { title: searchRegex },
        { author: searchRegex },
        { isbn: searchRegex },
      ];
    }

    // Filter by genre
    if (genre) {
      query.genre = genre;
    }

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const books = await Book.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Book.countDocuments(query);

    res.json({
      success: true,
      data: {
        books,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Get single book by ID (public)
 */
export const getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }
    res.json({ success: true, data: book });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Search books
 */
export const searchBooks = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query (q) is required",
      });
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
    }).limit(parseInt(limit));

    res.json({ success: true, data: books });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Get books by genre
 */
export const getBooksByGenre = async (req, res) => {
  try {
    const { genre } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const books = await Book.find({ genre })
      .limit(parseInt(limit))
      .skip(skip)
      .sort("-rating");

    const total = await Book.countDocuments({ genre });

    res.json({
      success: true,
      data: {
        books,
        genre,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Get available books only
 */
export const getAvailableBooks = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const books = await Book.find({ availableQuantity: { $gt: 0 } })
      .limit(parseInt(limit))
      .skip(skip)
      .sort("-rating");

    const total = await Book.countDocuments({ availableQuantity: { $gt: 0 } });

    res.json({
      success: true,
      data: {
        books,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
