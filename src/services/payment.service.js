/**
 * Payment Service
 * Handles payment processing, verification, and database operations
 */

import { paymentRepository } from "../modules/payments/payment.repository.js";
import { borrowingRepository } from "../modules/borrowings/borrowing.repository.js";
import Payment from "../models/payment.model.js";
import Borrowing from "../models/borrowing.model.js";
import {
  getPaymentGateway,
  generateTransactionId,
  validateGatewayConfig,
} from "./paymentGateway.service.js";

export const paymentService = {
  /**
   * Create a payment for a fine
   * Initiates payment with selected gateway
   */
  async createPayment(userId, borrowingId, paymentMethod) {
    try {
      // Validate gateway configuration
      validateGatewayConfig(paymentMethod);

      // Get borrowing record
      const borrowing = await borrowingRepository.findById(borrowingId);
      if (!borrowing) {
        throw new Error("Borrowing record not found");
      }

      // Check authorization
      if (borrowing.user._id.toString() !== userId) {
        throw new Error("Not authorized to create payment for this borrowing");
      }

      // Check if fine exists
      if (borrowing.fineAmount <= 0) {
        throw new Error("No fine to pay for this borrowing");
      }

      // Check if fine already marked as paid
      if (borrowing.finePaid) {
        throw new Error("Fine for this borrowing is already paid");
      }

      // Check if payment already exists
      const existingPayment = await paymentRepository.findPendingByBorrowing(
        borrowingId
      );
      if (existingPayment) {
        throw new Error("Payment already initiated for this borrowing");
      }

      // Generate transaction ID
      const transactionId = generateTransactionId(borrowingId);

      // Create payment record
      const paymentData = {
        user: userId,
        borrowing: borrowingId,
        amount: borrowing.fineAmount,
        paymentMethod,
        transactionId,
        paymentStatus: "pending",
        description: `Fine payment for book: ${borrowing.book.title}`,
        metadata: {
          book: borrowing.book._id,
          bookTitle: borrowing.book.title,
          dueDate: borrowing.dueDate,
          returnedDate: borrowing.returnedDate || null,
        },
      };

      const payment = await paymentRepository.create(paymentData);

      // Get payment gateway
      const gateway = getPaymentGateway(paymentMethod);

      // Initiate payment with gateway
      const gatewayResponse = await gateway.initiate({
        amount: borrowing.fineAmount,
        transactionId,
        email: borrowing.user.email,
        phoneNumber: borrowing.user.phoneNumber,
        description: paymentData.description,
        metadata: paymentData.metadata,
      });

      // Update payment with gateway response
      await paymentRepository.update(payment._id, {
        paymentGatewayResponse: gatewayResponse,
      });

      return {
        payment: await paymentRepository.findById(payment._id),
        gateway: gatewayResponse,
      };
    } catch (error) {
      throw new Error(`Payment creation failed: ${error.message}`);
    }
  },

  /**
   * Verify and complete payment
   */
  async verifyPayment(paymentId, verificationData, paymentMethod) {
    try {
      // Get payment record
      const payment = await paymentRepository.findById(paymentId);
      if (!payment) {
        throw new Error("Payment not found");
      }

      if (payment.paymentStatus !== "pending") {
        throw new Error(`Cannot verify non-pending payment. Status: ${payment.paymentStatus}`);
      }

      // Get payment gateway
      const gateway = getPaymentGateway(paymentMethod);

      // Verify with gateway
      let verificationResult;
      if (paymentMethod === "khalti") {
        verificationResult = await gateway.verify(
          verificationData.token,
          payment.transactionId
        );
      } else if (paymentMethod === "esewa") {
        verificationResult = await gateway.verify(verificationData);
      } else if (paymentMethod === "cash") {
        verificationResult = await gateway.verify(
          payment.transactionId,
          verificationData.verifiedBy
        );
      } else {
        // Stripe or other
        verificationResult = await gateway.verify(verificationData.paymentIntentId);
      }

      if (!verificationResult.success) {
        // Update payment as failed
        await paymentRepository.update(paymentId, {
          paymentStatus: "failed",
          failureReason: verificationResult.message,
          paymentGatewayResponse: verificationResult,
        });

        throw new Error(
          verificationResult.message || "Payment verification failed"
        );
      }

      // Update payment record
      const updatedPayment = await paymentRepository.update(paymentId, {
        paymentStatus: "success",
        externalTransactionId: verificationResult.externalTransactionId,
        paidAt: new Date(),
        paymentGatewayResponse: verificationResult.details,
      });

      // Update borrowing record - mark fine as paid
      await borrowingRepository.update(payment.borrowing._id, {
        finePaid: true,
      });

      return updatedPayment;
    } catch (error) {
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  },

  /**
   * Get payment details
   */
  async getPayment(paymentId, userId, isAdmin) {
    const payment = await paymentRepository.findById(paymentId);

    if (!payment) {
      throw new Error("Payment not found");
    }

    // Authorization check
    if (!isAdmin && payment.user._id.toString() !== userId) {
      throw new Error("Not authorized to view this payment");
    }

    return payment;
  },

  /**
   * Get user's payments
   */
  async getUserPayments(userId, query) {
    const { page = 1, limit = 10, status } = query;

    const payments = await paymentRepository.findByUser(userId, {
      page,
      limit,
      status,
    });

    const total = await paymentRepository.countByUser(
      userId,
      status ? { paymentStatus: status } : {}
    );

    return {
      payments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    };
  },

  /**
   * Get all payments (Admin)
   */
  async getAllPayments(query) {
    const { page = 1, limit = 10, status, userId, paymentMethod } = query;

    const filter = {};
    if (status) filter.paymentStatus = status;
    if (userId) filter.user = userId;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    const payments = await paymentRepository.findAll(filter, { page, limit });
    const total = await paymentRepository.count(filter);

    return {
      payments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    };
  },

  /**
   * Get payment statistics
   */
  async getPaymentStats() {
    const stats = await paymentRepository.getStats();

    return {
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          total: stat.total,
        };
        return acc;
      }, {}),
    };
  },

  /**
   * Get user's payment statistics
   */
  async getUserPaymentStats(userId) {
    const stats = await paymentRepository.getUserStats(userId);

    return {
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          total: stat.total,
        };
        return acc;
      }, {}),
    };
  },

  /**
   * Cancel pending payment
   */
  async cancelPayment(paymentId, userId, isAdmin) {
    const payment = await paymentRepository.findById(paymentId);

    if (!payment) {
      throw new Error("Payment not found");
    }

    // Authorization check
    if (!isAdmin && payment.user._id.toString() !== userId) {
      throw new Error("Not authorized to cancel this payment");
    }

    if (payment.paymentStatus !== "pending") {
      throw new Error(
        `Cannot cancel ${payment.paymentStatus} payment. Only pending payments can be cancelled.`
      );
    }

    await paymentRepository.update(paymentId, {
      paymentStatus: "cancelled",
      failureReason: "Cancelled by user",
    });

    return await paymentRepository.findById(paymentId);
  },

  /**
   * Retry failed payment
   */
  async retryPayment(paymentId, userId) {
    const payment = await paymentRepository.findById(paymentId);

    if (!payment) {
      throw new Error("Payment not found");
    }

    // Authorization check
    if (payment.user._id.toString() !== userId) {
      throw new Error("Not authorized to retry this payment");
    }

    if (payment.paymentStatus !== "failed") {
      throw new Error("Only failed payments can be retried");
    }

    // Reset payment to pending
    await paymentRepository.update(paymentId, {
      paymentStatus: "pending",
      failureReason: null,
    });

    // Get payment gateway and reinitiate
    const gateway = getPaymentGateway(payment.paymentMethod);
    const gatewayResponse = await gateway.initiate({
      amount: payment.amount,
      transactionId: payment.transactionId,
      email: payment.user.email,
      phoneNumber: payment.user.phoneNumber,
      description: payment.description,
      metadata: payment.metadata,
    });

    await paymentRepository.update(paymentId, {
      paymentGatewayResponse: gatewayResponse,
    });

    return await paymentRepository.findById(paymentId);
  },

  /**
   * Get pending payments for borrowing
   */
  async getPendingPayment(borrowingId) {
    return paymentRepository.findPendingByBorrowing(borrowingId);
  },
};
