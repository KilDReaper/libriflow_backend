import express from "express";
import path from "path";
import authRoutes from "./modules/auth/auth.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { fileURLToPath } from "url";
import adminRoutes from "./modules/admin/admin.routes.js";
import bookRoutes from "./modules/books/book.routes.js";
import reservationRoutes from "./modules/reservations/reservation.routes.js";
import borrowingRoutes from "./modules/borrowings/borrowing.routes.js";
import borrowRoutes from "./modules/borrow/borrow.routes.js";
import paymentRoutes from "./modules/payments/payment.routes.js";
import purchaseRoutes from "./modules/purchases/purchase.routes.js";
import recommendationRoutes from "./modules/recommendations/recommendation.routes.js";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads/users', express.static(path.join(process.cwd(), 'uploads/users')));
app.use('/uploads/books', express.static(path.join(process.cwd(), 'uploads/books')));

app.use("/api/admin", adminRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/books/recommendations", recommendationRoutes); // Must come before /api/books
app.use("/api/books", bookRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/borrowings", borrowingRoutes);
app.use("/api/borrow", borrowRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use(errorHandler);

export default app;
