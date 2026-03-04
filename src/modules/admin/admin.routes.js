import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import adminMiddleware from "../../middlewares/admin.middleware.js";
import upload from "../../middlewares/upload.middleware.js";
import bookUpload from "../../middlewares/bookUpload.middleware.js";
import * as adminController from "./admin.controller.js";

const router = Router();

router.post(
  "/users",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  adminController.createUser
);

router.get("/users", authMiddleware, adminMiddleware, adminController.getUsers);
router.get("/users/:id", authMiddleware, adminMiddleware, adminController.getUser);

router.put(
  "/users/:id",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  adminController.updateUser
);

router.delete(
  "/users/:id",
  authMiddleware,
  adminMiddleware,
  adminController.deleteUser
);

// Book Management Routes
router.post(
  "/books",
  authMiddleware,
  adminMiddleware,
  bookUpload.single("coverImage"),
  adminController.createBook
);

router.get("/books/inventory-stats", authMiddleware, adminMiddleware, adminController.getInventoryStats);

router.get("/books/search", authMiddleware, adminMiddleware, adminController.searchBooks);

router.get("/books", authMiddleware, adminMiddleware, adminController.getBooks);

router.get("/books/:id", authMiddleware, adminMiddleware, adminController.getBook);

router.put(
  "/books/:id",
  authMiddleware,
  adminMiddleware,
  bookUpload.single("coverImage"),
  adminController.updateBook
);

router.delete(
  "/books/:id",
  authMiddleware,
  adminMiddleware,
  adminController.deleteBook
);

export default router;
