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
    database: 'c237_026_team4_skillexcdb',
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
                    Member 1 :USER REGISTRATION
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
// Gamification Helper Functions
// ===============================================

//Award XP to user and triggers level up check
function awardXP(userId, amount) {
    connection.query(
        'UPDATE users SET points = COALESCE(points, 0) + ? WHERE id = ?',
        [amount, userId],
        (err) => {
            if (err) {
                console.error('Error awarding XP:', err);
                return;
            }
            checkLevelUp(userId);
        }
    );
}

//Level Up check: triggers if have enough XP
function checkLevelUp(userId) {
    connection.query(
        'SELECT points, level FROM users WHERE id = ?',
        [userId],
        (err, results) => {
            if (err || results.length === 0) {
                console.error('Error checking level:', err);
                return;
            }
            const xp = results[0].points || 0;
            const level = results[0].level || 1;
            if (xp >= level * 100) {
                connection.query(
                    'UPDATE users SET level = level + 1 WHERE id = ?',
                    [userId]
                );
            }
        }
    );
}

//Check if badge already earned, then insert if not
function awardBadge(userId, badgeName) {
    connection.query(
        'SELECT id FROM user_badges WHERE user_id = ? AND badge_name = ?',
        [userId, badgeName],
        (err, rows) => {
            if (err) {
                console.error('Error checking badge:', err);
                return;
            }
            if (rows.length > 0) return;
            connection.query(
                'INSERT INTO user_badges (user_id, badge_name) VALUES (?, ?)',
                [userId, badgeName]
            );
        }
    );
}

//Checks exchange history & completion, awarding badges to both learner & teacher if completed
function checkAndAwardBadges(userId) {
    connection.query(
        'SELECT COUNT(*) AS total FROM matches WHERE (learner_id = ? OR teacher_id = ?) AND status = "completed"',
        [userId, userId],
        (err, result) => {
            if (err) return;
            const total = result[0].total;
            if (total >= 1) awardBadge(userId, 'First Step');
            if (total >= 5) awardBadge(userId, 'Active Learner');
            if (total >= 10) awardBadge(userId, 'Skill Master');
            if (total >= 20) awardBadge(userId, 'Community Hero');
        }
    );
    connection.query(
        'SELECT COUNT(*) AS count FROM matches WHERE teacher_id = ? AND status = "completed"',
        [userId],
        (err, result) => {
            if (err) return;
            if (result[0].count >= 5) awardBadge(userId, 'Top Teacher');
        }
    );
}

// ===============================================
// GET /badges - Display badges and progress page
// ===============================================

//Protected route, queries user XP, level, exchange stuff & earned badges before routing to badges.ejs
app.get('/badges', checkAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    connection.query('SELECT points, level FROM users WHERE id = ?', [userId], (err, userRows) => {
        if (err) {
            console.error('Badges query error:', err.sqlMessage || err);
            req.flash('error', 'User not found');
            return res.redirect('/');
        }
        if (userRows.length === 0) {
            console.error('No user found with id:', userId);
            req.flash('error', 'User not found');
            return res.redirect('/');
        }

        const xp = userRows[0].points || 0;
        const level = userRows[0].level || 1;
        const xpForNextLevel = level * 100;

        connection.query(
            'SELECT COUNT(*) AS total FROM matches WHERE (learner_id = ? OR teacher_id = ?) AND status = "completed"',
            [userId, userId],
            (err, exchangeRows) => {
                const totalExchanges = exchangeRows ? exchangeRows[0].total : 0;

                connection.query(
                    'SELECT COUNT(*) AS count FROM matches WHERE teacher_id = ? AND status = "completed"',
                    [userId],
                    (err, teacherRows) => {
                        const teacherExchanges = teacherRows ? teacherRows[0].count : 0;

                        connection.query(
                            'SELECT badge_name FROM user_badges WHERE user_id = ?',
                            [userId],
                            (err, badgeRows) => {
                                const earnedBadges = badgeRows ? badgeRows.map(b => b.badge_name) : [];

                                res.render('badges', {
                                    pageTitle: 'Badges',
                                    activePage: 'Badges',
                                    xp,
                                    level,
                                    xpForNextLevel,
                                    progressPercent: Math.min((xp / xpForNextLevel) * 100, 100),
                                    totalExchanges,
                                    teacherExchanges,
                                    earnedBadges
                                });
                            }
                        );
                    }
                );
            }
        );
    });
});

/********************************************************************
                   Member 5: CHAT & SCHEDULING
********************************************************************/

// ===============================================
// TODO: Create messaging system
// ===============================================


// ===============================================
// TODO: Store chat messages
// ===============================================


// ===============================================
// TODO: Schedule learning sessions
// ===============================================


// ===============================================
// TODO: Prevent overlapping bookings
// ===============================================



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
