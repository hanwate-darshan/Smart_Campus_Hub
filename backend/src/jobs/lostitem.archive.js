const { Queue, Worker, QueueEvents } = require("bullmq");
const LostItem = require("../models/LostItem.model");

const REDIS_OPTIONS = {
  connection: {
    url: process.env.REDIS_URL
  }
};

const ARCHIVE_QUEUE_NAME = "lost-found-archive";

const archiveQueue = new Queue(ARCHIVE_QUEUE_NAME, REDIS_OPTIONS);

// The Worker logic
const archiveWorker = new Worker(
  ARCHIVE_QUEUE_NAME,
  async (job) => {
    console.log(`[JOB] Starting archive check: ${job.id}`);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find items in_office older than 30 days
    const result = await LostItem.updateMany(
      {
        status: "in_office",
        createdAt: { $lt: thirtyDaysAgo }
      },
      {
        $set: { 
          status: "archived", 
          archivedAt: new Date() 
        }
      }
    );

    console.log(`[JOB] Archived ${result.modifiedCount} items.`);
    return result.modifiedCount;
  },
  REDIS_OPTIONS
);

// Schedule the recurring job (every day at midnight)
const initArchiveJob = async () => {
  try {
    // Remove existing repeatable jobs to avoid duplicates
    const repeatableJobs = await archiveQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await archiveQueue.removeRepeatableByKey(job.key);
    }

    await archiveQueue.add(
      "daily-archive",
      {},
      {
        repeat: {
          pattern: "0 0 * * *", // Midnight every day
        },
      }
    );
    console.log("[JOB] Lost & Found Auto-Archive job scheduled (Midnight).");
  } catch (err) {
    console.error("[JOB] Failed to schedule archive job:", err.message);
  }
};

module.exports = {
  initArchiveJob,
  archiveQueue
};
