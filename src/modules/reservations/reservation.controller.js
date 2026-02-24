import { reservationService } from "./reservation.service.js";

export const reservationController = {

  async createReservation(req, res, next) {
    try {
      const { bookId } = req.body;

      if (!bookId) {
        return res.status(400).json({
          success: false,
          message: "Book ID is required",
        });
      }

      const reservation = await reservationService.createReservation(
        req.user.id,
        bookId
      );

      res.status(201).json({
        success: true,
        message:
          reservation.status === "approved"
            ? "Reservation approved! Please collect the book within 2 days."
            : `Reservation created. You are number ${reservation.queuePosition} in the queue.`,
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  },

  async getUserReservations(req, res, next) {
    try {
      const result = await reservationService.getUserReservations(
        req.user.id,
        req.query
      );

      res.status(200).json({
        success: true,
        data: result.reservations,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAllReservations(req, res, next) {
    try {
      const result = await reservationService.getAllReservations(req.query);

      res.status(200).json({
        success: true,
        data: result.reservations,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  async getReservationById(req, res, next) {
    try {
      const isAdmin = req.user.role === "admin";
      const reservation = await reservationService.getReservationById(
        req.params.id,
        req.user.id,
        isAdmin
      );

      res.status(200).json({
        success: true,
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  },

  async getBookReservations(req, res, next) {
    try {
      const result = await reservationService.getBookReservations(
        req.params.bookId,
        req.query
      );

      res.status(200).json({
        success: true,
        data: result.reservations,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  async cancelReservation(req, res, next) {
    try {
      const isAdmin = req.user.role === "admin";
      const reservation = await reservationService.cancelReservation(
        req.params.id,
        req.user.id,
        isAdmin
      );

      res.status(200).json({
        success: true,
        message: "Reservation cancelled successfully",
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  },

  async completeReservation(req, res, next) {
    try {
      const reservation = await reservationService.completeReservation(
        req.params.id
      );

      res.status(200).json({
        success: true,
        message: "Reservation marked as completed",
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  },

  async getQueueStatus(req, res, next) {
    try {
      const queueStatus = await reservationService.getQueueStatus(
        req.params.bookId
      );

      res.status(200).json({
        success: true,
        data: queueStatus,
      });
    } catch (error) {
      next(error);
    }
  },

  async expireOldReservations(req, res, next) {
    try {
      const result = await reservationService.expireOldReservations();

      res.status(200).json({
        success: true,
        message: `Expired ${result.expired} reservation(s)`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
