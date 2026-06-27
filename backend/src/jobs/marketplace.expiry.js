const { Queue, Worker } = require("bullmq");
const Listing = require("../models/Listing.model");

const createBullConnection = require("../config/bullConnection");

const EXPIRY_QUEUE_NAME = "marketplace-expiry";

const expiryQueue = new Queue(EXPIRY_QUEUE_NAME, { connection: createBullConnection() });

// The Worker logic
const expiryWorker = new Worker(
  EXPIRY_QUEUE_NAME,
  async (job) => {
    console.log(`[JOB] Starting marketplace expiry check: ${job.id}`);
    
    // Find approved listings where expiresAt is less than now
    const now = new Date();

    const result = await Listing.updateMany(
      {
        status: "approved",
        expiresAt: { $lt: now }
      },
      {
        $set: { 
          status: "expired" 
        }
      }
    );

    console.log(`[JOB] Expired ${result.modifiedCount} marketplace listings.`);
    return result.modifiedCount;
  }, { connection: createBullConnection() });

// Schedule the recurring job (every day at midnight)
const initExpiryJob = async () => {
  try {
    // Remove existing repeatable jobs to avoid duplicates
    const repeatableJobs = await expiryQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await expiryQueue.removeRepeatableByKey(job.key);
    }

    await expiryQueue.add(
      "daily-expiry",
      {},
      {
        repeat: {
          pattern: "0 0 * * *", // Midnight every day
        },
      }
    );
    console.log("[JOB] Marketplace Auto-Expiry job scheduled (Midnight).");
  } catch (err) {
    console.error("[JOB] Failed to schedule marketplace expiry job:", err.message);
  }
};

module.exports = {
  initExpiryJob,
  expiryQueue
};
