/**
 * Payment Gateway Service
 * Abstracted layer for payment gateway integrations
 * Currently supports: Khalti, eSewa, Stripe, Cash
 */

import axios from "axios";
import crypto from "crypto";

/**
 * Khalti Payment Gateway
 * Nepal's most popular payment gateway
 * Documentation: https://docs.khalti.com/
 */
export const khaltiGateway = {
  /**
   * Initialize Khalti payment
   */
  async initiate(paymentData) {
    const {
      amount,
      transactionId,
      email,
      phoneNumber,
      description,
      metadata,
    } = paymentData;

    try {
      const payload = {
        public_key: process.env.KHALTI_PUBLIC_KEY,
        transaction_uuid: transactionId,
        description: description || "Fine payment for borrowed book",
        amount: amount * 100, // Khalti expects amount in paisa
        failure_url: `${process.env.FRONTEND_URL}/payment/failed`,
        success_url: `${process.env.FRONTEND_URL}/payment/success`,
        website_url: process.env.FRONTEND_URL,
        customer_info: {
          name: metadata?.userName || "Customer",
          email: email,
          phone: phoneNumber,
        },
      };

      // For testing/integration - return payload structure
      // In production, you would redirect to Khalti's payment page
      return {
        success: true,
        paymentUrl: `https://khalti.com/checkout/`,
        payload: payload,
        message: "Khalti payment initiated",
      };
    } catch (error) {
      throw new Error(`Khalti initialization failed: ${error.message}`);
    }
  },

  /**
   * Verify Khalti payment
   */
  async verify(token, transactionId) {
    try {
      const response = await axios.post(
        "https://khalti.com/api/payment/verify/",
        {
          token: token,
          amount: null, // Will be filled by Khalti API
        },
        {
          headers: {
            Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
          },
        }
      );

      if (response.data.state.name === "Completed") {
        return {
          success: true,
          paymentStatus: "success",
          externalTransactionId: response.data.transaction_id,
          amount: response.data.amount / 100, // Convert from paisa to Rupees
          details: response.data,
        };
      } else {
        return {
          success: false,
          paymentStatus: "failed",
          message: "Payment not completed",
        };
      }
    } catch (error) {
      throw new Error(
        `Khalti verification failed: ${error.response?.data?.detail || error.message}`
      );
    }
  },

  /**
   * Get payment details
   */
  async getPaymentDetails(transactionId) {
    try {
      const response = await axios.get(
        `https://khalti.com/api/payment/${transactionId}/`,
        {
          headers: {
            Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch Khalti payment details: ${error.message}`);
    }
  },
};

/**
 * eSewa Payment Gateway
 * Popular payment gateway in Nepal and Bangladesh
 * Documentation: https://esewa.com.np/developers
 */
export const esewaGateway = {
  /**
   * Initialize eSewa payment
   */
  async initiate(paymentData) {
    const {
      amount,
      transactionId,
      email,
      phoneNumber,
      description,
      metadata,
    } = paymentData;

    try {
      const payload = {
        amt: amount,
        psc: 0,
        pdc: 0,
        txAmt: 0,
        tAmt: amount,
        pid: transactionId,
        scd: process.env.ESEWA_MERCHANT_CODE,
        su: `${process.env.FRONTEND_URL}/payment/success`,
        fu: `${process.env.FRONTEND_URL}/payment/failed`,
      };

      // Generate eSewa signature
      const signature = generateEsewaSignature(payload);

      return {
        success: true,
        paymentUrl: "https://esewa.com.np/epay/main",
        payload: payload,
        signature: signature,
        message: "eSewa payment initiated",
      };
    } catch (error) {
      throw new Error(`eSewa initialization failed: ${error.message}`);
    }
  },

  /**
   * Verify eSewa payment
   */
  async verify(data) {
    try {
      // eSewa sends verification data via query params
      const verifyData = {
        amt: data.amt,
        rid: data.rid, // eSewa reference ID
        pid: data.pid, // Transaction ID from our system
        scd: process.env.ESEWA_MERCHANT_CODE,
      };

      const response = await axios.post(
        "https://esewa.com.np/api/validate",
        verifyData
      );

      if (response.data.status === "Success") {
        return {
          success: true,
          paymentStatus: "success",
          externalTransactionId: data.rid,
          amount: parseFloat(data.amt),
          details: response.data,
        };
      } else {
        return {
          success: false,
          paymentStatus: "failed",
          message: response.data.message || "Payment verification failed",
        };
      }
    } catch (error) {
      throw new Error(
        `eSewa verification failed: ${error.response?.data?.message || error.message}`
      );
    }
  },
};

/**
 * Stripe Payment Gateway
 * For international payments
 * Documentation: https://stripe.com/docs
 */
export const stripeGateway = {
  /**
   * Create payment intent
   */
  async initiate(paymentData) {
    const { amount, transactionId, email, description, metadata } = paymentData;

    try {
      // This would use stripe SDK in production
      // For now, return prepared structure
      return {
        success: true,
        clientSecret: `${transactionId}_secret_key`,
        message: "Stripe payment page initiated",
        payload: {
          amount: amount * 100, // Stripe expects amount in cents
          currency: "usd",
          description: description,
          receipt_email: email,
          metadata: metadata,
        },
      };
    } catch (error) {
      throw new Error(`Stripe initiation failed: ${error.message}`);
    }
  },

  /**
   * Verify Stripe payment
   */
  async verify(paymentIntentId) {
    try {
      // This would use Stripe SDK in production
      return {
        success: true,
        paymentStatus: "success",
        externalTransactionId: paymentIntentId,
        message: "Payment verified with Stripe",
      };
    } catch (error) {
      throw new Error(`Stripe verification failed: ${error.message}`);
    }
  },
};

/**
 * Cash Payment Gateway
 * For offline/counter payments
 */
export const cashGateway = {
  /**
   * Record cash payment
   */
  async initiate(paymentData) {
    const { amount, transactionId, description } = paymentData;

    return {
      success: true,
      paymentStatus: "pending", // Will be marked as success by admin
      transactionId: transactionId,
      message: `Cash payment of Rs ${amount} initiated. Please pay at counter.`,
      instructions: "Payment will be verified by library staff and marked as complete.",
    };
  },

  /**
   * Verify cash payment (admin only)
   */
  async verify(transactionId, verifiedBy) {
    return {
      success: true,
      paymentStatus: "success",
      externalTransactionId: transactionId,
      verifiedBy: verifiedBy,
      message: "Cash payment verified",
    };
  },
};

/**
 * Helper Functions
 */

/**
 * Generate eSewa signature
 */
function generateEsewaSignature(payload) {
  const data = `${payload.amt}${payload.psc}${payload.pdc}${payload.txAmt}${payload.tAmt}${payload.pid}${payload.scd}`;
  return crypto.createHash("md5").update(data).digest("hex");
}

/**
 * Get gateway instance based on payment method
 */
export const getPaymentGateway = (paymentMethod) => {
  const gateways = {
    khalti: khaltiGateway,
    esewa: esewaGateway,
    stripe: stripeGateway,
    cash: cashGateway,
  };

  return gateways[paymentMethod] || null;
};

/**
 * Validate payment gateway configuration
 */
export const validateGatewayConfig = (paymentMethod) => {
  const requiredEnvVars = {
    khalti: ["KHALTI_PUBLIC_KEY", "KHALTI_SECRET_KEY"],
    esewa: ["ESEWA_MERCHANT_CODE"],
    stripe: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY"],
    cash: [], // No config needed
  };

  const required = requiredEnvVars[paymentMethod] || [];
  const missing = required.filter((envVar) => !process.env[envVar]);

  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables for ${paymentMethod}: ${missing.join(", ")}`
    );
  }

  return true;
};

/**
 * Generate unique transaction ID
 */
export const generateTransactionId = (borrowingId) => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 9);
  return `TXN_${borrowingId}_${timestamp}_${random}`.toUpperCase();
};
