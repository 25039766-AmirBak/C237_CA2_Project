const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage: storage });

const connection = mysql.createConnection({
    host: 'c237-adib-mysql.mysql.database.azure.com',
    user: 'c237_026',
    password: 'c237026@2026!',
    database: 'c237_026_team4_userdb',
    ssl:{
        rejectUnauthorized:false
    }
  });

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Promise-based wrapper so we can use async/await with mysql2
const db = connection.promise();

// Set up view engine
app.set('view engine', 'ejs');
//  enable static files
app.use(express.static('public'));
// enable form processing
app.use(express.urlencoded({
    extended: false
}));

//TO DO: Insert code for Session Middleware below 
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    // Session expires after 1 week of inactivity
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } 
}));

app.use(flash());

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
    if (req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/shopping');
    }
};

// Middleware for form validation
const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact, role } = req.body;

    if (!username || !email || !password || !address || !contact || !role) {
        return res.status(400).send('All fields are required.');
    }
    
    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

/********************************************************************
                    Index.ejs : HomePage
********************************************************************/
app.get("/", (req, res) => {
    res.render("index", {
        pageTitle: "Home",
        activePage: "Home"
    });
});


/********************************************************************
                    Mmeber 1 :USER REGISTRATION
********************************************************************/

// ===============================================
// TODO: Create middleware validateRegistration()
// Check:
// - Empty fields
// - Email format
// - Password length
// - Duplicate email
// ===============================================


// ===============================================
// TODO: Hash password using bcrypt before saving
// ===============================================


// ===============================================
// TODO: Create POST /register
// Insert new user into database
// ===============================================

/********************************************************************
                    Member 2 :SKILL LISTINGS
********************************************************************/

// ===============================================
// TODO: Create GET /skills
// Display all available skills
// ===============================================


// ===============================================
// TODO: Create POST /skills/add
// Save new skill into database
// ===============================================


// ===============================================
// TODO: Create GET /skills/search
// Search skills using keyword
// ===============================================

/********************************************************************
                    Member 3: MATCHING SYSTEM
********************************************************************/

// ===============================================
// TODO: Create GET /matches
// Show potential skill exchange partners
// ===============================================


// ===============================================
// TODO: Write SQL JOIN query
// users + skills
// ===============================================


// ===============================================
// TODO: Filter users by matching skills
// ===============================================

/********************************************************************
                    Member 4: GAMIFICATION
********************************************************************/

// ===============================================
// TODO: Award XP after completed exchange
// ===============================================


// ===============================================
// TODO: Update progress bar
// ===============================================


// ===============================================
// TODO: Award badges
// First Trade
// Top Teacher
// Skill Master
// ===============================================

/********************************************************************
                   Member 5: CHAT & SCHEDULING
********************************************************************/

// ---------------------------------------------------------
// MESSAGING
// ---------------------------------------------------------

// GET /messages - inbox: list of conversations, and (if ?with=<id>
// is present) the message thread with that user
app.get('/messages', checkAuthenticated, async (req, res) => {
    const myId = req.session.user.id;

    try {
        // Everyone I've exchanged at least one message with, most recent first
        const [conversations] = await db.query(
            `SELECT u.id, u.username, MAX(m.created_at) AS last_message_time
             FROM messages m
             JOIN users u ON u.id = IF(m.sender_id = ?, m.receiver_id, m.sender_id)
             WHERE m.sender_id = ? OR m.receiver_id = ?
             GROUP BY u.id, u.username
             ORDER BY last_message_time DESC`,
            [myId, myId, myId]
        );

        // Everyone else, so a new conversation can be started
        const [allUsers] = await db.query(
            'SELECT id, username FROM users WHERE id != ?',
            [myId]
        );

        let partner = null;
        let thread = [];
        const withId = req.query.with;

        if (withId) {
            const [partnerRows] = await db.query(
                'SELECT id, username FROM users WHERE id = ?',
                [withId]
            );
            partner = partnerRows[0] || null;

            if (partner) {
                [thread] = await db.query(
                    `SELECT m.*, u.username AS sender_username
                     FROM messages m
                     JOIN users u ON u.id = m.sender_id
                     WHERE (m.sender_id = ? AND m.receiver_id = ?)
                        OR (m.sender_id = ? AND m.receiver_id = ?)
                     ORDER BY m.created_at ASC`,
                    [myId, withId, withId, myId]
                );

                // Mark incoming messages from this partner as read
                await db.query(
                    'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
                    [withId, myId]
                );
            }
        }

        res.render('message', {
            pageTitle: 'Messages',
            activePage: 'Messages',
            user: req.session.user,
            conversations,
            allUsers,
            partner,
            thread,
            errors: req.flash('error'),
            successMsgs: req.flash('success')
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Unable to load messages');
        res.redirect('/');
    }
});

// POST /chat/send - send a message to another user
app.post('/chat/send', checkAuthenticated, async (req, res) => {
    const senderId = req.session.user.id;
    const { receiver_id, message_text } = req.body;

    if (!receiver_id || !message_text || !message_text.trim()) {
        req.flash('error', 'Message cannot be empty');
        return res.redirect('/messages' + (receiver_id ? '?with=' + receiver_id : ''));
    }

    try {
        await db.query(
            'INSERT INTO messages (sender_id, receiver_id, message_text) VALUES (?, ?, ?)',
            [senderId, receiver_id, message_text.trim()]
        );
        res.redirect('/messages?with=' + receiver_id);
    } catch (err) {
        console.error(err);
        req.flash('error', 'Unable to send message');
        res.redirect('/messages');
    }
});

// ---------------------------------------------------------
// SCHEDULING
// ---------------------------------------------------------

// GET /schedule - show my upcoming sessions + booking form
app.get('/schedule', checkAuthenticated, async (req, res) => {
    const myId = req.session.user.id;

    try {
        const [sessions] = await db.query(
            `SELECT s.*, ureq.username AS requester_username, upar.username AS partner_username
             FROM learning_sessions s
             JOIN users ureq ON ureq.id = s.requester_id
             JOIN users upar ON upar.id = s.partner_id
             WHERE (s.requester_id = ? OR s.partner_id = ?)
               AND s.status = 'confirmed'
             ORDER BY s.session_date ASC, s.start_time ASC`,
            [myId, myId]
        );

        const [allUsers] = await db.query(
            'SELECT id, username FROM users WHERE id != ?',
            [myId]
        );

        res.render('schedule', {
            pageTitle: 'Schedule',
            activePage: 'Schedule',
            user: req.session.user,
            sessions,
            allUsers,
            errors: req.flash('error'),
            successMsgs: req.flash('success')
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Unable to load schedule');
        res.redirect('/');
    }
});

// POST /schedule - create a new booking, preventing overlapping sessions
// Note: all bookings are treated as being in Singapore time (SGT) - this is a
// local, single-timezone skill-exchange app, so no timezone conversion is needed.
app.post('/schedule', checkAuthenticated, async (req, res) => {
    const myId = req.session.user.id;
    const { partner_id, skill_topic, session_date, start_time, end_time } = req.body;

    if (!partner_id || !session_date || !start_time || !end_time) {
        req.flash('error', 'All fields are required');
        return res.redirect('/schedule');
    }

    if (start_time >= end_time) {
        req.flash('error', 'End time must be after start time');
        return res.redirect('/schedule');
    }

    try {
        // A slot clashes if either the requester or the partner already has a
        // confirmed session that day whose time range overlaps the new one
        const [clashes] = await db.query(
            `SELECT id FROM learning_sessions
             WHERE status = 'confirmed'
               AND session_date = ?
               AND (requester_id IN (?, ?) OR partner_id IN (?, ?))
               AND start_time < ? AND end_time > ?`,
            [session_date, myId, partner_id, myId, partner_id, end_time, start_time]
        );

        if (clashes.length > 0) {
            req.flash('error', 'That time slot overlaps with an existing session for you or your partner');
            return res.redirect('/schedule');
        }

        await db.query(
            `INSERT INTO learning_sessions (requester_id, partner_id, skill_topic, session_date, start_time, end_time)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [myId, partner_id, skill_topic || null, session_date, start_time, end_time]
        );

        req.flash('success', 'Session booked!');
        res.redirect('/schedule');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Unable to book session');
        res.redirect('/schedule');
    }
});

// POST /schedule/cancel/:id - cancel a booking (only its requester or partner may cancel it)
app.post('/schedule/cancel/:id', checkAuthenticated, async (req, res) => {
    const myId = req.session.user.id;
    const sessionId = req.params.id;

    try {
        const [result] = await db.query(
            `UPDATE learning_sessions
             SET status = 'cancelled'
             WHERE id = ? AND (requester_id = ? OR partner_id = ?)`,
            [sessionId, myId, myId]
        );

        if (result.affectedRows === 0) {
            req.flash('error', 'Session not found or you do not have permission to cancel it');
        } else {
            req.flash('success', 'Session cancelled');
        }
        res.redirect('/schedule');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Unable to cancel session');
        res.redirect('/schedule');
    }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
