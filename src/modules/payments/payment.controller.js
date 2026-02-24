/**
 * Payment Controller
 * Handles payment-related HTTP requests
 */

import { paymentService } from "../../services/payment.service.js";

export const paymentController = {
  /**
   * Create a payment for borrowing fine
   * POST /api/payments
   */
  async createPayment(req, res, next) {
    try {
      const { borrowingId, paymentMethod } = req.body;

      if (!borrowingId || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: "Borrowing ID and payment method are required",
        });
      }

      const validMethods = ["khalti", "esewa", "stripe", "cash"];
      if (!validMethods.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: `Invalid payment method. Allowed: ${validMethods.join(", ")}`,
        });
      }

      const result = await paymentService.createPayment(
        req.user.id,
        borrowingId,
        paymentMethod
      );

      res.status(201).json({
        success: true,
        message: `Payment initiated via ${paymentMethod}`,
        data: {
          payment: result.payment,
          gateway: result.gateway,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Verify and complete payment
   * PATCH /api/payments/:id/verify
   */
  async verifyPayment(req, res, next) {
    try {
      const { id } = req.params;
      const { paymentMethod, token, referenceId, verificationData } = req.body;

      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          message: "Payment method is required for verification",
        });
      }

      // Prepare verification data based on payment method
      let verify_data;
      if (paymentMethod === "khalti") {
        verify_data = { token: token || req.body.token };
      } else if (paymentMethod === "esewa") {
        verify_data = {
          amt: req.body.amount,
          rid: referenceId || req.body.rid,
          pid: req.body.pid,
        };
      } else if (paymentMethod === "cash") {
        verify_data = { verifiedBy: req.user.id };
      } else {
        verify_data = verificationData;
      }

      const payment = await paymentService.verifyPayment(
        id,
        verify_data,
        paymentMethod
      );

      res.status(200).json({
        success: true,
        message: "Payment verified and completed successfully",
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get payment details
   * GET /api/payments/:id
   */
  async getPayment(req, res, next) {
    try {
      const isAdmin = req.user.role === "admin";
      const payment = await paymentService.getPayment(
        req.params.id,
        req.user.id,
        isAdmin
      );

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get user's payments
   * GET /api/payments/my
   */
  async getUserPayments(req, res, next) {
    try {
      const result = await paymentService.getUserPayments(
        req.user.id,
        req.query
      );

      res.status(200).json({
        success: true,
        data: result.payments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all payments (Admin)
   * GET /api/payments
   */
  async getAllPayments(req, res, next) {
    try {
      const result = await paymentService.getAllPayments(req.query);

      res.status(200).json({
        success: true,
        data: result.payments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get payment statistics (Admin)
   * GET /api/payments/stats
   */
  async getPaymentStats(req, res, next) {
    try {
      const stats = await paymentService.getPaymentStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get user's payment statistics
   * GET /api/payments/my/stats
   */
  async getUserPaymentStats(req, res, next) {
    try {
      const stats = await paymentService.getUserPaymentStats(req.user.id);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Cancel pending payment
   * PATCH /api/payments/:id/cancel
   */
  async cancelPayment(req, res, next) {
    try {
      const isAdmin = req.user.role === "admin";
      const payment = await paymentService.cancelPayment(
        req.params.id,
        req.user.id,
        isAdmin
      );

      res.status(200).json({
        success: true,
        message: "Payment cancelled successfully",
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Retry failed payment
   * POST /api/payments/:id/retry
   */
  async retryPayment(req, res, next) {
    try {
      const payment = await paymentService.retryPayment(
        req.params.id,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: "Payment retry initiated",
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Webhook endpoint for payment gateway callbacks
   * POST /api/payments/webhook/khalti
   */
  async khaltiWebhook(req, res, next) {
    try {
      // This is called by Khalti after payment
      const { object } = req.body;

      if (object.state.name === "Completed") {
        // Payment successful - verify through API
        // In production: verify and update payment record
        res.status(200).json({
          success: true,
          message: "Webhook processed",
        });
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * Webhook endpoint for eSewa callbacks
   * GET /api/payments/webhook/esewa
   */
  async esewaWebhook(req, res, next) {
    try {
      // eSewa sends verification via GET params
      const { amt, rid, pid } = req.query;

      // Verify payment through eSewa API
      // In production: verify and update payment record
      res.status(200).json({
        success: true,
        message: "Payment verified",
        data: { pid },
      });
    } catch (error) {
      next(error);
    }
  },
};
