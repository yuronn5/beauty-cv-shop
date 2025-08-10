// netlify/functions/contact.js
const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { name, email, msg_subject, message } = data;

  // Basic validation
  let errorMSG = "";
  if (!name) errorMSG += "Name is required. ";
  if (!email) errorMSG += "Email is required. ";
  if (!msg_subject) errorMSG += "Subject is required. ";
  if (!message) errorMSG += "Message is required. ";

  if (errorMSG) {
    return { statusCode: 400, body: errorMSG.trim() };
  }

  // Configure transporter
  // Option A: use Gmail via app password (recommended if using Gmail)
  // Option B: use SMTP provider (SendGrid, Mailgun, etc.)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || undefined,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
    secure: process.env.SMTP_SECURE === "true" || false, // true for 465
    service: process.env.EMAIL_SERVICE || undefined, // e.g. "gmail"
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"${name}" <${process.env.EMAIL_USER}>`, // use your verified/sender email here
    replyTo: email, // reply goes to site visitor
    to: process.env.EMAIL_TO || process.env.EMAIL_USER,
    subject: `New Message: ${msg_subject}`,
    text: `Name: ${name}\nEmail: ${email}\nSubject: ${msg_subject}\n\nMessage:\n${message}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { statusCode: 200, body: "success" };
  } catch (err) {
    console.error("Email error:", err);
    return { statusCode: 500, body: "Something went wrong :(" };
  }
};
