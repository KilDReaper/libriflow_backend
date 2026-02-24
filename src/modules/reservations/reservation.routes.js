import express from "express";
import { reservationController } from "./reservation.controller.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import adminMiddleware from "../../middlewares/admin.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", reservationController.createReservation);

router.get("/my", reservationController.getUserReservations);

router.patch("/:id/cancel", reservationController.cancelReservation);
router.get("/:id", reservationController.getReservationById);

router.get("/book/:bookId", reservationController.getBookReservations);

router.get("/book/:bookId/queue", reservationController.getQueueStatus);

router.get("/", adminMiddleware, reservationController.getAllReservations);

router.patch(
  "/:id/complete",
  adminMiddleware,
  reservationController.completeReservation
);

router.post(
  "/expire",
  adminMiddleware,
  reservationController.expireOldReservations
);

export default router;
