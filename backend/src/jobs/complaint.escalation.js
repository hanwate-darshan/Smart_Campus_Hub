const { Queue, Worker } = require("bullmq");
const Complaint = require("../models/Complaint.model");
const User = require("../models/User.model");
const pushNotification = require("../utils/pushNotification");
const { sendEmail } = require("../utils/email.utils");
const logger = require("../config/logger");

const createBullConnection = require("../config/bullConnection");

const ESCALATION_QUEUE_NAME = "complaint-escalation";
const escalationQueue = new Queue(ESCALATION_QUEUE_NAME, { connection: createBullConnection() });

const escalationWorker = new Worker(
  ESCALATION_QUEUE_NAME,
  async (job) => {
    try {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

      const complaintsToEscalate = await Complaint.find({
        status: { $in: ["submitted", "in_review"] },
        updatedAt: { $lt: cutoff },
        escalatedAt: null
      });

      if (complaintsToEscalate.length === 0) {
        logger.info("No complaints to escalate");
        return;
      }

      const admins = await User.find({ role: "admin", status: "approved" });

      for (const complaint of complaintsToEscalate) {
        await Complaint.updateOne({ _id: complaint._id }, { $set: { escalatedAt: new Date() } });

        for (const admin of admins) {
          // 1. Push notification
          pushNotification(admin._id, {
            type: "escalation",
            title: "Complaint Escalated",
            message: `"${complaint.title}" has had no action for 48+ hours`,
            link: "/admin/complaints"
          });

          // 2. Email notification
          if (admin.email) {
            sendEmail({
              to: admin.email,
              subject: "URGENT: Complaint Escalated",
              html: `
                <h3 style="color: red;">Complaint Escalated</h3>
                <p>The following complaint requires immediate attention as it has had no action for 48 hours:</p>
                <ul>
                  <li><strong>Title:</strong> ${complaint.title}</li>
                  <li><strong>Category:</strong> ${complaint.category}</li>
                  <li><strong>Current Status:</strong> ${complaint.status}</li>
                  <li><strong>Submitted At:</strong> ${complaint.createdAt.toLocaleString()}</li>
                </ul>
                <p>Please review it in the Admin Dashboard.</p>
              `
            }).catch(err => logger.error(`Failed to email admin ${admin.email}`, err));
          }
        }
      }

      logger.info(`Escalated ${complaintsToEscalate.length} complaints.`);
    } catch (err) {
      logger.error("Error processing complaint escalation job", err);
      throw err;
    }
  }, { connection: createBullConnection() }
);

const initComplaintEscalationJob = async () => {
  try {
    const repeatableJobs = await escalationQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await escalationQueue.removeRepeatableByKey(job.key);
    }

    await escalationQueue.add(
      "hourly-escalation",
      {},
      { repeat: { pattern: "0 * * * *" } } // Every hour
    );
    logger.info("Complaint Escalation Job scheduled (Every hour)");
  } catch (err) {
    logger.error("Failed to schedule complaint escalation job:", err);
  }
};

module.exports = {
  escalationQueue,
  initComplaintEscalationJob
};
