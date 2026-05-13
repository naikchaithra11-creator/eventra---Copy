const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./database');
const cron = require('node-cron');
const emailService = require('./emailService');

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
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

// API: Book Ticket & Schedule Emails
app.post('/api/book-ticket', async (req, res) => {
  const { userEmail, userName, eventTitle, eventDate } = req.body;
  if (!userEmail || !eventTitle || !eventDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Send the instant booking confirmation email (asynchronously)
    emailService.sendBookingConfirmation(userEmail, userName, eventTitle, eventDate);

    // 2. Store in reminders table for the cron job to pick up later
    const stmt = db.prepare('INSERT INTO reminders (user_email, user_name, event_title, event_date, notified) VALUES (?, ?, ?, ?, 0)');
    stmt.run(userEmail, userName || '', eventTitle, eventDate);

    res.status(200).json({ message: 'Ticket booking processed.' });
  } catch (error) {
    console.error('Error booking ticket backend:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
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

// Start Server
app.listen(PORT, () => {
  console.log(`Eventra server is running on http://localhost:${PORT}`);
});
