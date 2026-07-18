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
