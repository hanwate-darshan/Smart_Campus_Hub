const nodemailer = require('nodemailer');

/**
 * Send an email using Nodemailer.
 * Expects an object with { to, subject, html, text } fields.
 * SMTP configuration is taken from environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 */
async function sendMail({ to, subject, html, text }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
  };

  // Send mail and return info
  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent:', info.messageId);
  return info;
}

module.exports = { sendMail };
