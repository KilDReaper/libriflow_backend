// src/utils/cronJobs.js
// Optional: Set up automatic expiration checking

import cron from "node-cron";
import { reservationService } from "../modules/reservations/reservation.service.js";

export const startCronJobs = () => {
  // Run every hour at minute 0
  // Cron format: minute hour day month day-of-week
  cron.schedule("0 * * * *", async () => {
    console.log("🔄 Running reservation expiration check...");
    try {
      const result = await reservationService.expireOldReservations();
      console.log(`✅ Expired ${result.expired} reservations`);
      
      if (result.expired > 0) {
        console.log("Processed IDs:", result.processed);
      }
    } catch (error) {
      console.error("❌ Error in expiration cron job:", error.message);
    }
  });

  console.log("✅ Cron jobs started - Checking for expired reservations every hour");
};

// To use this, install node-cron: npm install node-cron
// Then in your server.js, after database connection:
// import { startCronJobs } from "./utils/cronJobs.js";
// startCronJobs();
