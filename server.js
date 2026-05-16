require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./database');
const cron = require('node-cron');
const emailService = require('./emailService');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const QRcode = require('qrcode');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'eventra-super-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Check authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// API: Register User
app.post('/api/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (!['user', 'host', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
    const info = stmt.run(name, email, hashedPassword, role);

    res.status(201).json({ message: 'Registration successful', userId: info.lastInsertRowid });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Email already in use.' });
    } else {
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
});

// API: Login User
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.name = user.name;

    res.json({ message: 'Login successful', role: user.role, name: user.name });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// API: Logout
app.post('/api/logout', requireAuth, (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

// API: Book Ticket & Schedule Emails
app.post('/api/book-ticket', async (req, res) => {
  const { userEmail, userName, eventTitle, eventDate, eventId, eventLocation } = req.body;
  if (!userEmail || !eventTitle || !eventDate || !eventId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const ticketId = 'TKT-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    // Insert into tickets table
    const stmtTicket = db.prepare('INSERT INTO tickets (id, user_email, user_name, event_id, event_title, event_date, event_location) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmtTicket.run(ticketId, userEmail, userName || '', eventId, eventTitle, eventDate, eventLocation || '');

    // 1. Generate QR code locally
    const qrData = `http://localhost:3000/ticket/${ticketId}`;
    const qrDir = path.join(__dirname, 'public', 'qrcodes');
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }
    const fileName = `qr_${ticketId}.png`;
    const filePath = path.join(qrDir, fileName);
    await QRcode.toFile(filePath, qrData);
    const qrUrl = `/qrcodes/${fileName}`;

    // 2. Send the instant booking confirmation email (asynchronously)
    const previewUrl = await emailService.sendBookingConfirmation(userEmail, userName, eventTitle, eventDate, filePath);

    // 3. Store in reminders table for the cron job to pick up later
    const stmt = db.prepare('INSERT INTO reminders (user_email, user_name, event_title, event_date, notified) VALUES (?, ?, ?, ?, 0)');
    stmt.run(userEmail, userName || '', eventTitle, eventDate);

    res.status(200).json({ message: 'Ticket booking processed.', emailPreviewUrl: previewUrl, qrUrl, ticketId });
  } catch (error) {
    console.error('Error booking ticket backend:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API: Notify Scan
app.post('/api/notify-scan', async (req, res) => {
  const { userEmail, userName, eventTitle, eventDate, eventLocation } = req.body;
  if (!userEmail) return res.status(400).json({ error: 'Missing email' });

  try {
    const previewUrl = await emailService.sendScanNotification(userEmail, userName, eventTitle, eventDate, eventLocation);
    res.status(200).json({ message: 'Notification sent', previewUrl });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET Ticket View Page
app.get('/ticket/:id', (req, res) => {
  const ticketId = req.params.id;
  const stmt = db.prepare('SELECT * FROM tickets WHERE id = ?');
  const ticket = stmt.get(ticketId);

  if (!ticket) {
    return res.status(404).send('<h1>Ticket Not Found</h1>');
  }

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Your Eventra Ticket</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
      .ticket-card { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px; text-align: center; max-width: 450px; width: 90%; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
      .qr-code { width: 220px; height: 220px; border-radius: 12px; margin: 25px 0; border: 4px solid white; }
      .btn { display: inline-block; padding: 12px 24px; background: #6366F1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 15px; transition: 0.3s; }
      .btn:hover { background: #4f46e5; transform: translateY(-2px); }
      .details { text-align: left; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-top: 20px; }
      .details p { margin: 8px 0; font-size: 0.95rem; }
    </style>
  </head>
  <body>
    <div class="ticket-card">
      <h2 style="color: #818cf8; margin-top:0;">Eventra Pass</h2>
      <p style="color: #cbd5e1; font-size: 0.9rem; margin-bottom: 20px;">Present this at the entrance</p>
      
      <img class="qr-code" src="/qrcodes/qr_${ticket.id}.png" alt="QR Code" />
      
      <div class="details">
        <p><strong style="color:#94a3b8;">Ticket ID:</strong> ${ticket.id}</p>
        <p><strong style="color:#94a3b8;">Event:</strong> ${ticket.event_title}</p>
        <p><strong style="color:#94a3b8;">Attendee:</strong> ${ticket.user_name || ticket.user_email}</p>
        <p><strong style="color:#94a3b8;">Date:</strong> ${ticket.event_date}</p>
        <p><strong style="color:#94a3b8;">Location:</strong> ${ticket.event_location || 'Online'}</p>
      </div>
      
      <a class="btn" href="/ticket/${ticket.id}/download">Download PDF</a>
      <div style="margin-top: 15px;">
        <a href="/" style="color: #94a3b8; font-size: 0.85rem; text-decoration: underline;">Back to Home</a>
      </div>
    </div>
  </body>
  </html>
  `;
  res.send(html);
});

// GET Download PDF Ticket
app.get('/ticket/:id/download', (req, res) => {
  const ticketId = req.params.id;
  const stmt = db.prepare('SELECT * FROM tickets WHERE id = ?');
  const ticket = stmt.get(ticketId);

  if (!ticket) {
    return res.status(404).send('Ticket Not Found');
  }

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const filename = `Eventra_Ticket_${ticketId}.pdf`;

  res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-type', 'application/pdf');

  doc.pipe(res);

  // Background color
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0f172a');
  
  // Header
  doc.fillColor('#818cf8').font('Helvetica-Bold').fontSize(30).text('Eventra Official Ticket', { align: 'center' });
  doc.moveDown(2);
  
  // Ticket Info container
  const boxTop = 150;
  doc.roundedRect(50, boxTop, doc.page.width - 100, 300, 10).lineWidth(2).stroke('#6366F1');
  
  doc.fillColor('white').fontSize(16).font('Helvetica-Bold').text(`Event: ${ticket.event_title}`, 70, boxTop + 30);
  doc.font('Helvetica').fontSize(14).fillColor('#cbd5e1');
  doc.text(`Ticket ID: ${ticket.id}`, 70, boxTop + 60);
  doc.text(`Attendee: ${ticket.user_name || ticket.user_email}`, 70, boxTop + 90);
  doc.text(`Date: ${ticket.event_date}`, 70, boxTop + 120);
  doc.text(`Location: ${ticket.event_location || 'Online'}`, 70, boxTop + 150);

  // QR Code
  const qrPath = path.join(__dirname, 'public', 'qrcodes', `qr_${ticket.id}.png`);
  if (fs.existsSync(qrPath)) {
    const qrSize = 160;
    const xPos = doc.page.width - 70 - qrSize;
    doc.image(qrPath, xPos, boxTop + 30, { width: qrSize, height: qrSize });
  }

  doc.moveDown(12);
  doc.fontSize(12).fillColor('#64748b').text('Please present this QR code at the entrance.', 0, boxTop + 320, { align: 'center' });
  doc.text('For support, contact support@eventra.com', { align: 'center' });

  doc.end();
});

// ---------------------------------------------------------
// CRON JOB: Check for 1-Day Reminders (Runs every hour)
// ---------------------------------------------------------
cron.schedule('0 * * * *', () => {
  console.log('Running scheduled check for 1-day event reminders...');
  try {
    // Fetch reminders that have not been notified
    const reminders = db.prepare('SELECT * FROM reminders WHERE notified = 0').all();

    reminders.forEach(reminder => {
      // Event dates are usually stored as YYYY-MM-DD
      const eventTime = new Date(reminder.event_date).getTime();
      const currentTime = new Date().getTime();

      // Calculate hours difference
      const diffInHours = (eventTime - currentTime) / (1000 * 60 * 60);

      // If the event is strictly within the next 24 to 48 hours, or exactly 1 day 
      // Simplified: If the event is in less than or equal to 24 hours, but hasn't passed yet.
      // E.g., difference is between 0 and 24 hours
      if (diffInHours > 0 && diffInHours <= 24) {
        // Send Reminder
        emailService.sendEventReminder(reminder.user_email, reminder.user_name, reminder.event_title, reminder.event_date);

        // Mark as notified so we don't send it again next hour
        const updateStmt = db.prepare('UPDATE reminders SET notified = 1 WHERE id = ?');
        updateStmt.run(reminder.id);
      }
    });
  } catch (err) {
    console.error('Error in cron job:', err);
  }
});

// API: Chatbot
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Fallback if API key is not configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      let replyText = "I'm the Eventra Chatbooth! (Running in fallback mode since the AI key isn't set yet). I can help with tickets, refunds, payments, or hosting events. What would you like to know?";
      const lowerText = message.toLowerCase();
      if (lowerText.match(/\b(hello|hi|hey|greetings|help|start|menu)\b/i)) replyText = "Hello there! Welcome to Eventra. Are you looking for events, or do you have questions about tickets, payments, or hosting?";
      else if (lowerText.match(/\b(ticket|tickets|booking|book|curations|events|event|attend)\b/i)) replyText = "You can view your booked tickets right here on your dashboard under 'My Tickets'. To find new events, check out the 'Curations' section!";
      else if (lowerText.match(/\b(refund|refunds|cancel|cancellation|return)\b/i)) replyText = "For cancellations and refunds, please contact the event host directly through the event details or reach out to our support team at support@eventra.io.";
      else if (lowerText.match(/\b(payment|pay|transaction|money|cost|price|gpay|phonepe)\b/i)) replyText = "We support Google Pay and PhonePe for seamless transactions. All payments are encrypted and secure!";
      else if (lowerText.match(/\b(host|create|organize|propose|new)\b/i)) replyText = "Want to host an event? You can sign out and register as a 'Host' persona to start creating and proposing your own experiences.";

      return res.json({ reply: replyText });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const context = `You are the Eventra Chatbooth, an AI assistant for the Eventra platform. You help users with event discovery, booking tickets, hosting events, payments (Google Pay, PhonePe), and general inquiries. Keep responses concise, friendly, and helpful. Do not mention that you are an AI model unless directly asked. You are speaking to a user directly.

User message: ${message}`;

    const result = await model.generateContent(context);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });

  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Eventra server is running on http://localhost:${PORT}`);
});
