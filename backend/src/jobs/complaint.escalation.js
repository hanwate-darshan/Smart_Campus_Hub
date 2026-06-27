const Bull = require("bull");
const Complaint = require("../models/Complaint.model");
const User = require("../models/User.model");
const pushNotification = require("../utils/pushNotification");
const { sendEmail } = require("../utils/email.utils");
const logger = require("../config/logger");

const escalationQueue = new Bull("complaint-escalation", process.env.REDIS_URL || "redis://127.0.0.1:6379");

escalationQueue.process(async (job) => {
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
      complaint.escalatedAt = new Date();
      await complaint.save();

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
});

const initComplaintEscalationJob = () => {
  escalationQueue.add({}, { repeat: { cron: "0 * * * *" } }); // Every hour
  logger.info("Complaint Escalation Job scheduled (Every hour)");
};

module.exports = {
  escalationQueue,
  initComplaintEscalationJob
};
