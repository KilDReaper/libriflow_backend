import { Router } from "express";
import * as bookController from "./book.controller.js";

const router = Router();

// Public routes - no authentication required
router.get("/", bookController.getAllBooks);
router.get("/search", bookController.searchBooks);
router.get("/genre/:genre", bookController.getBooksByGenre);
router.get("/available", bookController.getAvailableBooks);
router.get("/:id", bookController.getBook);

export default router;
