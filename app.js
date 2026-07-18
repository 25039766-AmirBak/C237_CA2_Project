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
    host: 'localhost',
    user: 'root',
    password: 'RP738964$',
    database: 'skillswap_db',
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
// TODO: Create GET /skills - display, search, filter and sort listings
app.get("/skills", (req, res) => {
    const keyword = req.query.keyword ? req.query.keyword.trim(): "";
    const category = req.query.category ? req.query.category.trim() : "";
    const level = req.query.level ? req.query.level.trim() : "";
    const sort = req.query.sort ? req.query.sort.trim() : "newest";

    let sql = ' SELECT skills.id,skills.user_id,skills.skill_name,skills.category,skills.skill_level,skills.description, skills.availability,skills.location,skills.created_at,users.name AS owner_name,users.profile_picture AS owner_picture FROM skills INNER JOIN users ON skill.user_id = user.id WHERE 1=1';

    const values =[];
    if (keyword !== "") {
        const searchKeyword = '%${keyword}%';
        sql += 'AND (skills.skill_name LIKE ? OR skills.description LIKE ? OR skills.category LIKE ? OR users.name LIKE ?)';

        values.push(searchKeyword,searchKeyword,searchKeyword,searchKeyword);
    }

    if (category !== "" && category !== "All") {
        sql += " AND skills.category = ?";
        values.push(category);
    }

    if (level !== "" && level !== "All") {
        sql += " AND skills.skill_level = ?";
        values.push(level);
    }

    if (sort === "oldest") {
        sql += " ORDER BY skills.created_at ASC";
    } else if (sort === "name-asc") {
        sql += " ORDER BY skills.skill_name ASC";
    } else if (sort === "name-desc") {
        sql += " ORDER BY skills.skill_name DESC";
    } else {
        sql += " ORDER BY skills.created_at DESC";
    }

    connection.query(sql, values, (err, results) => {
        if (err) {
            console.error("Error retrieving skills:", err);

            return res.status(500).send(
                "Unable to retrieve skill listings."
            );
        }
        return res.render("skills", {
            skills: results,
            keyword: keyword,
            selectedCategory: category || "All",
            selectedLevel: level || "All",
            selectedSort: sort,
            currentUserId: req.session.userId || null
        });
    });
});


// ===============================================
// TODO: Create GET /skills/search // Search skills using keyword
app.get("/skills/search", (req, res) => {
    const keyword = req.query.keyword ? req.query.keyword.trim() : "";

    res.redirect(
        `/skills?keyword=${encodeURIComponent(keyword)}`
    );
});

// ========================================================
// TODO: Create GET /skills/add - display the Add Skill page
app.get("/skills/add", (req, res) => {
    return res.render("addSkill",{
        error:null,
        formData:{}
    });
});

// ===========================================================
// TODO: Create POST /skills/add - validate and insert a skill
app.post("/skills/add", (req, res) => {
    const skillName = req.body.skill_name ? req.body.skill_name.trim()  : "";
    const category = req.body.category ? req.body.category.trim() : "";
    const skillLevel = req.body.skill_level ? req.body.skill_level.trim() : "";
    const description = req.body.description ? req.body.description.trim() : "";
    const availability = req.body.availability ? req.body.availability.trim(): "";
    const location = req.body.location ? req.body.location.trim() : "";

    const formData = {
        skill_name: skillName,
        category: category,
        skill_level: skillLevel,
        description: description,
        availability: availability,
        location: location
    };

    if (
        skillName === "" ||
        category === "" ||
        skillLevel === "" ||
        description === ""
    ) {
        return res.status(400).render("addSkill", {
            error:
                "Skill name, category, skill level and description are required.",
            formData: formData
        });
    }

    const sql = 'INSERT INTO skills (user_id,skill_name,category,skill_level,description,availability,location) VALUES (?, ?, ?, ?, ?, ?, ?)';

    const values = [
        req.session.userId,
        skillName,
        category,
        skillLevel,
        description,
        availability || null,
        location || null
    ];

    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error adding skill:", err);

            return res.status(500).render("addSkill", {
                error:
                    "Unable to add the skill. Please try again.",
                formData: formData
            });
        }

        return res.redirect("/skills");
    });
});

// ===============================================
// TODO: Create POST /skills/:id/delete — delete the logged-in user’s listing
app.post("/skills/:id/delete" , (req, res) => {
    const skillId = Number.parseInt(req.params.id,10);

    if(!Number.isInteger(skillId) || skillId <= 0)
    {
        return res.status(400).send("Invalid skill ID.");
    }

    const sql = 'DELETE FROM skills WHERE id =? AND user_id =?';
    const values =[skillId, req.session.userId];

    connection.query(sql, values, (err, result) => {
            if (err) {
                console.error(
                    "Error deleting skill:",
                    err
                );
                return res.status(500).send(
                    "Unable to delete the skill."
                );
            }
            if (result.affectedRows === 0) {
                return res.status(404).send(
                    "Skill not found or you do not own this listing."
                );
            }
            return res.redirect("/skills");
        });
    }
);


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
