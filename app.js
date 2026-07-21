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
        res.redirect('/');
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

/*
Temporary login for testing Feature 2.

The user with ID 4 must exist in the users table.

Remove this middleware after Member 1 completes the real
registration and login system.
*/
const TEMP_TEST_USER_ID = 4;

app.use((req, res, next) => {
    if (!req.session.user) {
        req.session.user = {
            id: TEMP_TEST_USER_ID,
            name: 'Test User',
            role: 'user'
        };
    }
    res.locals.currentUser = req.session.user;
    next();
});



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

const SKILL_CATEGORIES = ['Technology','Language','Music','Design','Business','Lifestyle','Sports','Other'];
const SKILL_LEVELS = ['Beginner','Intermediate','Advanced','Expert'];
const SKILL_TYPES = ['Offer','Learn'];
const AVAILABILITY_OPTIONS = ['Weekdays','Weekends','Evenings','Flexible'];

const getSkillFormData = (body) => {
    return {
        skill_name: body.skill_name? body.skill_name.trim(): '',
        category: body.category ? body.category.trim(): '',
        skill_level: body.skill_level? body.skill_level.trim() : '',
        skill_type: body.skill_type ? body.skill_type.trim(): '',
        description: body.description ? body.description.trim(): '',
        availability: body.availability? body.availability.trim(): '',
        location: body.location? body.location.trim(): ''
    };
};

const validateSkill = (skill) => {
    if (
        !skill.skill_name ||
        !skill.category ||
        !skill.skill_level ||
        !skill.skill_type ||
        !skill.description ||
        !skill.availability ||
        !skill.location
    ) {return 'Please complete all required fields marked with *.';}

    if (!SKILL_CATEGORIES.includes(skill.category)) {
        return 'Please select a valid category.';
    }

    if (!SKILL_LEVELS.includes(skill.skill_level)) {
        return 'Please select a valid skill level.';
    }

    if (!SKILL_TYPES.includes(skill.skill_type)) {
        return 'Please select a valid skill type.';
    }

    if (
        !AVAILABILITY_OPTIONS.includes(
            skill.availability
        )
    ) {
        return 'Please select a valid availability option.';
    }

    if (
        skill.skill_name.length < 2 ||
        skill.skill_name.length > 100
    ) {
        return 'Skill name must be between 2 and 100 characters.';
    }

    if (
        skill.description.length < 10 ||
        skill.description.length > 1000
    ) {
        return 'Description must be between 10 and 1000 characters.';
    }

    if (skill.location.length > 100) {
        return 'Location cannot exceed 100 characters.';
    }

    return null;
};

// TODO: Create GET /skills - display, search, filter and sort listings
app.get("/skills", (req, res) => {
    const keyword = req.query.keyword ? req.query.keyword.trim(): "";
    const category = req.query.category ? req.query.category.trim() : "";
    const level = req.query.level ? req.query.level.trim() : "";
    const skillType = req.query.skill_type ? req.query.skill_type.trim() : "";
    const sort = req.query.sort ? req.query.sort.trim() : "newest";

    let sql = ' SELECT skills.id,skills.user_id,skills.skill_name,skills.category,skills.skill_level,skills.skill_type,skills.description, skills.availability,skills.location,skills.created_at,users.name AS owner_name,users.profile_picture AS owner_picture FROM skills INNER JOIN users ON skills.user_id = users.id WHERE 1=1';

    const values =[];
    if (keyword !== "") {
        const searchKeyword = `%${keyword}%`;
        sql += ' AND (skills.skill_name LIKE ? OR skills.description LIKE ? OR skills.category LIKE ? OR users.name LIKE ?)';

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

    if (skillType !== "") {
        sql += " AND skills.skill_type = ?";
        values.push(skillType);
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
            selectedSkillType: skillType,
            selectedSort: sort,
            currentUserId: req.session.user.id || null
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
app.get("/skills/add",checkAuthenticated, (req, res) => {
    return res.render("addSkill",{
        error:null,
        formData:{}
    });
});

// ===========================================================
// TODO: Create POST /skills/add - validate and insert a skill
app.post("/skills/add", checkAuthenticated,(req, res) => {
    const userId = req.session.user.id;
    const formData = getSkillFormData(req.body);
    const validationError = validateSkill(formData);
    
    if (validationError) {
        return res.status(400).render(
            'addSkill',
            {
                error: validationError,
                formData: formData
            }
        );
    } 
    const sql = 'INSERT INTO skills (user_id,skill_name,category,skill_level,skill_type,description,availability,location) VALUES (?, ?, ?, ?, ?, ?, ?,?)';

    const values = [
        userId,
        formData.skill_name,
        formData.category,
        formData.skill_level,
        formData.skill_type,
        formData.description,
        formData.availability || null,
        formData.location || null
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

        return res.redirect(`/skills/success/${result.insertId}`);
    });
});

// ===========================================================
// GET /skills/success/:id - display successful skill submission
app.get("/skills/success/:id",checkAuthenticated, (req, res) => {
    const userId = req.session.user.id;
    const skillId = Number.parseInt(req.params.id,10);

    if (
        !Number.isInteger(skillId) ||
            skillId <= 0
    ) {
        return res.status(400).send('Invalid skill ID.');
    }

    const sql = 'SELECT id,skill_name,category,skill_level,skill_type,description,availability,location FROM skills WHERE user_id = ?';

    connection.query(sql, [skillId,userId], (err, results) => {
        if (err) {
            console.error("Error retrieving skill:", err);
            return res.status(500).send("Unable to retrieve the skill.");
        }

        if (results.length === 0) {
            console.log("Skill ID:", skillId);
            console.log("Session user ID:", userId);

            return res.status(404).send(
                "Skill not found or this skill does not belong to the current user."
            );
        }

        return res.render("skillSuccess", {
            skill: results[0]
        });
    });
});

// ===============================================
// TODO: Create GET /my-skills — delete dispaly user's skill
app.get("/my-skills",checkAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    const sql = 'SELECT id,skill_name,category,skill_level,skill_type,description,availability,location,created_at  FROM skills WHERE user_id = ? ORDER BY created_at DESC';

    connection.query(sql, [userId], (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).send("Unable to retrieve skills.");
        }

        return res.render("myskillpage", {
            skills: results,
            savedSkillsCount: 0,
            success: req.flash("success")[0] || null,
            error: req.flash("error")[0] || null
        });
    });
});

// ===========================================================
// GET /skills/:id/edit - display the Edit Skill form
app.get("/skills/:id/edit",checkAuthenticated, (req, res) => {
    const skillId = Number.parseInt(req.params.id, 10);

     const userId = req.session.user.id;

    if (!Number.isInteger(skillId) || skillId <= 0) {
        req.flash('error','Invalid skill ID.');

        return res.redirect('/my-skills');
    }

    const sql = 'SELECT id, skill_name,category,skill_level,skill_type,description, availability,location FROM skills WHERE id = ? AND user_id = ?';

    connection.query(sql, [skillId, userId], (err, results) => {
        if (err) {
            console.error("Error retrieving skill for editing:", err);

            req.flash('error',"Unable to retrieve the skill.");
    
            return res.redirect('/my-skills');}

        if (results.length === 0) {
            return res.status(404).send(
                "Skill not found or you do not own this skill."
            );
        return res.redirect('/my-skills');}

        return res.render("editSkill", {
            skill: results[0],
            error: null
        });
    });
});

// ===========================================================
// POST /skills/:id/edit - update the selected skill
app.post("/skills/:id/edit",checkAuthenticated, (req, res) => {
    const skillId = Number.parseInt(req.params.id, 10);

    const userId = req.session.user.id;
    const formData = getSkillFormData(req.body);
    const skill = {id: skillId,...formData };

    if (
        !Number.isInteger(skillId) ||
        skillId <= 0
    ) {
        return res.status(400).render(
            'editSkill',
            {
                skill: skill,
                error: 'Invalid skill ID.'
            }
        );
    }

    const validationError = validateSkill( formData);

    if (validationError) {
        return res.status(400).render(
            'editSkill',
            {
                skill: skill,
                error: validationError
            }
        );
    }



    const sql = 'UPDATE skills SET skill_name = ?, category = ?,skill_level = ?,skill_type = ?,description = ?,availability = ?,location = ? WHERE id = ? AND user_id = ?';

    const values = [
        formData.skill_name,
        formData.category,
        formData.skill_level,
        formData.skill_type,
        formData.description,
        formData.availability,
        formData.location,
        skillId,
        userId
    ];

    connection.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error updating skill:", err);

            return res.status(500).render("editSkill", {
                skill: skill,
                error: "Unable to update the skill."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).render("editSkill", {
                skill: skill,
                error: "Skill not found or you do not own this skill."
            });
        }

        req.flash("success", "Skill updated successfully.");

        return res.redirect("/my-skills");
    });
});

// ===============================================
// TODO: Create POST /skills/:id/delete — delete the logged-in user’s listing
app.post("/skills/:id/delete" , checkAuthenticated,(req, res) => {
    const skillId = Number.parseInt(req.params.id,10);

    const userId = req.session.user.id;

    if(!Number.isInteger(skillId) || skillId <= 0)
    {
        req.flash("error", "Invalid skill ID.");
        return res.redirect("/my-skills");
}
    const sql = 'DELETE FROM skills WHERE id =? AND user_id =?';

    // connection.query(sql, values, (err, result) => {
    connection.query(sql, [skillId, userId], (err, result) => {
            if (err) {
                console.error(
                    "Error deleting skill:",
                    err
                );
                req.flash(
                    'error',
                    'Unable to delete the skill.'
                );

                return res.redirect('/my-skills');
            }

            if (result.affectedRows === 0) {
                req.flash(
                    "error",
                    "Skill not found or you do not own this listing."
                );

                return res.redirect("/my-skills");}

                req.flash(
                    'success',
                    'Skill deleted successfully.'
                );

                return res.redirect('/my-skills');
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
