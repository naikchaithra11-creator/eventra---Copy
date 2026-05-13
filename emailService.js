const nodemailer = require('nodemailer');

// Set up the transporter (Ethereal for testing or placeholder for real SMTP)
let transporter;

async function initTransporter() {
  if (transporter) return transporter;

  try {
    // Generate a test ethereal account if you don't have a real one configured
    // For Production: replace with { host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: '...', pass: '...' } }
    let testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });

    console.log('✅ Nodemailer Transport Initialized (Ethereal test mode)');
    return transporter;
  } catch (err) {
    console.error('Error setting up Ethereal transport:', err);
  }
}

/**
 * Sends a booking confirmation email.
 */
async function sendBookingConfirmation(email, name, eventTitle, eventDate) {
  const transp = await initTransporter();
  
  const mailOptions = {
    from: '"Eventra Booking System" <no-reply@eventra.com>',
    to: email,
    subject: `Event Booking Confirmed: ${eventTitle}`,
    text: `Hello ${name || 'User'},\n\nYour ticket for '${eventTitle}' on ${eventDate} has been successfully booked.\nThank you for choosing Eventra!`,
    html: `<div style="font-family: sans-serif; padding: 20px;">
            <h2>Hello ${name || 'User'},</h2>
            <p>Your ticket for <strong>${eventTitle}</strong> on <strong>${eventDate}</strong> has been successfully booked!</p>
            <p>We are excited to see you there.</p>
            <hr />
            <p><em>Thank you for choosing Eventra!</em></p>
           </div>`
  };

  try {
    let info = await transp.sendMail(mailOptions);
    console.log('✉️ Booking Email sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    return true;
  } catch (error) {
    console.error('Failed to send booking email:', error);
    return false;
  }
}

/**
 * Sends a 1-day reminder email.
 */
async function sendEventReminder(email, name, eventTitle, eventDate) {
  const transp = await initTransporter();
  
  const mailOptions = {
    from: '"Eventra Reminders" <no-reply@eventra.com>',
    to: email,
    subject: `REMINDER: ${eventTitle} is tomorrow!`,
    text: `Hello ${name || 'User'},\n\nThis is a friendly reminder that your event '${eventTitle}' is happening tomorrow (${eventDate}).\nWe look forward to seeing you.`,
    html: `<div style="font-family: sans-serif; padding: 20px; border-left: 5px solid #3b82f6;">
            <h2>Hello ${name || 'User'},</h2>
            <p>This is a friendly reminder that your event <strong>${eventTitle}</strong> is happening tomorrow (<strong>${eventDate}</strong>).</p>
            <p>Don't forget to have your ticket ready!</p>
            <br/>
            <p>See you there!</p>
           </div>`
  };

  try {
    let info = await transp.sendMail(mailOptions);
    console.log('✉️ Reminder Email sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    return true;
  } catch (error) {
    console.error('Failed to send reminder email:', error);
    return false;
  }
}

module.exports = {
  sendBookingConfirmation,
  sendEventReminder
};
