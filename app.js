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

// Promise version of the MySQL connection.
// Required because the matching system uses await db.query(...).
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

// ========================================================
// TEMPORARY LOGIN FOR TESTING
// Remove after Member 1 finishes the real login system.
// Change the ID to a user_id that exists in the database.
// ========================================================

const TEMP_TEST_USER_ID = 1;

app.use((req, res, next) => {
    if (!req.session.user) {
        req.session.user = {
            id: TEMP_TEST_USER_ID,
            user_id: TEMP_TEST_USER_ID,
            full_name: 'Test User',
            role: 'user'
        };
    }

    res.locals.currentUser = req.session.user;
    next();
});

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

const normaliseMatchText = (value) =>
    String(value || '').trim().toLowerCase();

/*
Temporary testing middleware.

The Skill Exchange database currently uses users.user_id.
Change TEST_USER_ID to a user_id that exists in:
c237_026_team4_skillexcdb.users

Remove this middleware when Member 1's final login system is integrated.
*/


/*
GET /matches

Matching rule:
1. The logged-in user's Learn skill must match another user's Offer skill.
2. A reciprocal match exists when the logged-in user offers a skill that
   the other user wants to learn.
3. Availability and location improve the match percentage.
*/
app.get('/matches', checkAuthenticated, async (req, res) => {
    const currentUserId = Number(
        req.session.user.user_id || req.session.user.id
    );

    try {
        /*
        Get the current user's skills.
        */
        const [mySkills] = await db.query(
            `SELECT
                id,
                user_id,
                skill_name,
                category,
                description,
                availability,
                location,
                skill_level,
                skill_type,
                created_at
             FROM skills
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [currentUserId]
        );

        const myOfferSkills = mySkills.filter(
            skill => normaliseMatchText(skill.skill_type) === 'offer'
        );

        const myLearnSkills = mySkills.filter(
            skill => normaliseMatchText(skill.skill_type) === 'learn'
        );

        /*
        Get skills belonging to other users.
        The actual users table uses user_id and full_name.
        */
        const [otherSkills] = await db.query(
            `SELECT
                s.id,
                s.user_id,
                s.skill_name,
                s.category,
                s.description,
                s.availability,
                s.location,
                s.skill_level,
                s.skill_type,
                s.created_at,
                u.full_name AS partner_name
             FROM skills s
             INNER JOIN users u
                ON u.user_id = s.user_id
             WHERE s.user_id <> ?
             ORDER BY u.full_name ASC, s.created_at DESC`,
            [currentUserId]
        );

        const otherOfferSkills = otherSkills.filter(
            skill => normaliseMatchText(skill.skill_type) === 'offer'
        );

        const otherLearnSkills = otherSkills.filter(
            skill => normaliseMatchText(skill.skill_type) === 'learn'
        );

        const potentialMatches = [];

        /*
        Match each Learn skill belonging to the current user
        against Offer skills belonging to other users.
        */
        for (const wantedSkill of myLearnSkills) {
            const matchingOffers = otherOfferSkills.filter(
                otherOffer =>
                    normaliseMatchText(otherOffer.skill_name) ===
                    normaliseMatchText(wantedSkill.skill_name)
            );

            for (const partnerOffer of matchingOffers) {
                /*
                Find the skills that this partner wants to learn.
                */
                const partnerLearnSkills = otherLearnSkills.filter(
                    partnerLearn =>
                        Number(partnerLearn.user_id) ===
                        Number(partnerOffer.user_id)
                );

                /*
                Check whether the current user offers anything
                the partner wants to learn.
                */
                const reciprocalOffer =
                    myOfferSkills.find(myOffer =>
                        partnerLearnSkills.some(partnerLearn =>
                            normaliseMatchText(partnerLearn.skill_name) ===
                            normaliseMatchText(myOffer.skill_name)
                        )
                    ) || null;

                const availabilityMatches =
                    normaliseMatchText(wantedSkill.availability) !== '' &&
                    normaliseMatchText(wantedSkill.availability) ===
                    normaliseMatchText(partnerOffer.availability);

                const locationMatches =
                    normaliseMatchText(wantedSkill.location) !== '' &&
                    normaliseMatchText(wantedSkill.location) ===
                    normaliseMatchText(partnerOffer.location);

                /*
                Match scoring:
                70% = required skill match
                20% = reciprocal skill match
                 5% = same availability
                 5% = same location
                */
                let matchPercentage = 70;

                if (reciprocalOffer) {
                    matchPercentage += 20;
                }

                if (availabilityMatches) {
                    matchPercentage += 5;
                }

                if (locationMatches) {
                    matchPercentage += 5;
                }

                potentialMatches.push({
                    partner_id: partnerOffer.user_id,
                    partner_name: partnerOffer.partner_name,

                    requested_skill_id: partnerOffer.id,
                    requested_skill_name: partnerOffer.skill_name,
                    requested_skill_level: partnerOffer.skill_level,

                    category: partnerOffer.category,
                    description: partnerOffer.description,
                    availability: partnerOffer.availability,
                    location: partnerOffer.location,

                    reciprocal_offer_id:
                        reciprocalOffer ? reciprocalOffer.id : null,

                    reciprocal_offer_name:
                        reciprocalOffer ? reciprocalOffer.skill_name : null,

                    availability_matches: availabilityMatches,
                    location_matches: locationMatches,

                    match_percentage: matchPercentage,

                    match_label:
                        matchPercentage >= 95
                            ? 'Excellent Match'
                            : matchPercentage >= 85
                            ? 'Strong Match'
                            : matchPercentage >= 75
                            ? 'Good Match'
                            : 'Potential Match'
                });
            }
        }

        /*
        Remove duplicate partner-skill results.
        */
        const uniqueMatchMap = new Map();

        for (const match of potentialMatches) {
            const matchKey =
                `${match.partner_id}-${match.requested_skill_id}`;

            const existingMatch = uniqueMatchMap.get(matchKey);

            if (
                !existingMatch ||
                match.match_percentage > existingMatch.match_percentage
            ) {
                uniqueMatchMap.set(matchKey, match);
            }
        }

        const matches = Array.from(uniqueMatchMap.values());

        matches.sort((firstMatch, secondMatch) => {
            if (
                secondMatch.match_percentage !==
                firstMatch.match_percentage
            ) {
                return (
                    secondMatch.match_percentage -
                    firstMatch.match_percentage
                );
            }

            return String(firstMatch.partner_name).localeCompare(
                String(secondMatch.partner_name)
            );
        });

        /*
        The existing matches table represents a learner requesting
        a teacher for one skill.
        */
        const [incomingRequests] = await db.query(
            `SELECT
                m.match_id AS id,
                m.learner_id AS requester_id,
                m.teacher_id AS partner_id,
                m.skill_id,
                m.status,
                m.matched_at AS created_at,
                learner.full_name AS requester_name,
                s.skill_name AS requested_skill_name
             FROM matches m
             INNER JOIN users learner
                ON learner.user_id = m.learner_id
             INNER JOIN skills s
                ON s.id = m.skill_id
             WHERE m.teacher_id = ?
             ORDER BY m.matched_at DESC`,
            [currentUserId]
        );

        const [outgoingRequests] = await db.query(
            `SELECT
                m.match_id AS id,
                m.learner_id AS requester_id,
                m.teacher_id AS partner_id,
                m.skill_id,
                m.status,
                m.matched_at AS created_at,
                teacher.full_name AS partner_name,
                s.skill_name AS requested_skill_name
             FROM matches m
             INNER JOIN users teacher
                ON teacher.user_id = m.teacher_id
             INNER JOIN skills s
                ON s.id = m.skill_id
             WHERE m.learner_id = ?
             ORDER BY m.matched_at DESC`,
            [currentUserId]
        );

        /*
        The current matches table stores only one skill_id.
        Add an offered skill name for the existing EJS layout.
        */
        for (const request of incomingRequests) {
            request.offered_skill_name = 'Skill exchange';
        }

        for (const request of outgoingRequests) {
            request.offered_skill_name = 'Skill exchange';
        }

        return res.render('matches', {
            pageTitle: 'Skill Matches',
            activePage: 'Matches',
            user: req.session.user,
            matches,
            myOfferSkills,
            myLearnSkills,
            incomingRequests,
            outgoingRequests,
            success: req.flash('success')[0] || null,
            error: req.flash('error')[0] || null
        });
    } catch (error) {
        console.error('Error loading matches:', error);

        return res.status(500).send(`
            <h1>Matching Error</h1>
            <p>${error.message}</p>
            <pre>${error.stack}</pre>
        `);
    }
});


/*
POST /matches/request

The matches table contains:
- learner_id
- teacher_id
- skill_id
- status
- matched_at
*/
app.post('/matches/request', checkAuthenticated, async (req, res) => {
    const learnerId = Number(
        req.session.user.user_id || req.session.user.id
    );

    const teacherId = Number(req.body.partner_id);
    const requestedSkillId = Number(req.body.requested_skill_id);

    if (
        !Number.isInteger(learnerId) ||
        !Number.isInteger(teacherId) ||
        !Number.isInteger(requestedSkillId)
    ) {
        req.flash('error', 'Invalid exchange request.');
        return res.redirect('/matches');
    }

    if (learnerId === teacherId) {
        req.flash(
            'error',
            'You cannot send an exchange request to yourself.'
        );

        return res.redirect('/matches');
    }

    try {
        /*
        Confirm the requested skill belongs to the selected teacher
        and is an Offer listing.
        */
        const [requestedSkills] = await db.query(
            `SELECT id
             FROM skills
             WHERE id = ?
               AND user_id = ?
               AND LOWER(skill_type) = 'offer'`,
            [requestedSkillId, teacherId]
        );

        if (requestedSkills.length === 0) {
            req.flash(
                'error',
                'The selected skill is no longer available.'
            );

            return res.redirect('/matches');
        }

        /*
        Prevent duplicate pending requests.
        */
        const [duplicateRequests] = await db.query(
            `SELECT match_id
             FROM matches
             WHERE learner_id = ?
               AND teacher_id = ?
               AND skill_id = ?
               AND status = 'pending'`,
            [learnerId, teacherId, requestedSkillId]
        );

        if (duplicateRequests.length > 0) {
            req.flash(
                'error',
                'You already sent this exchange request.'
            );

            return res.redirect('/matches');
        }

        await db.query(
            `INSERT INTO matches
                (learner_id, teacher_id, skill_id, status, matched_at)
             VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
            [learnerId, teacherId, requestedSkillId]
        );

        req.flash(
            'success',
            'Exchange request sent successfully.'
        );

        return res.redirect('/matches');
    } catch (error) {
        console.error('Error sending exchange request:', error);

        req.flash(
            'error',
            'Unable to send the exchange request.'
        );

        return res.redirect('/matches');
    }
});


/*
POST /matches/request/:id/accept

Only the teacher receiving the request may accept it.
*/
app.post(
    '/matches/request/:id/accept',
    checkAuthenticated,
    async (req, res) => {
        const matchId = Number(req.params.id);

        const currentUserId = Number(
            req.session.user.user_id || req.session.user.id
        );

        if (!Number.isInteger(matchId)) {
            req.flash('error', 'Invalid request ID.');
            return res.redirect('/matches');
        }

        try {
            const [result] = await db.query(
                `UPDATE matches
                 SET status = 'accepted'
                 WHERE match_id = ?
                   AND teacher_id = ?
                   AND status = 'pending'`,
                [matchId, currentUserId]
            );

            if (result.affectedRows === 1) {
                req.flash(
                    'success',
                    'Exchange request accepted.'
                );
            } else {
                req.flash(
                    'error',
                    'This request cannot be accepted.'
                );
            }

            return res.redirect('/matches');
        } catch (error) {
            console.error(
                'Error accepting exchange request:',
                error
            );

            req.flash(
                'error',
                'Unable to accept the request.'
            );

            return res.redirect('/matches');
        }
    }
);


/*
POST /matches/request/:id/reject

Only the teacher receiving the request may reject it.
*/
app.post(
    '/matches/request/:id/reject',
    checkAuthenticated,
    async (req, res) => {
        const matchId = Number(req.params.id);

        const currentUserId = Number(
            req.session.user.user_id || req.session.user.id
        );

        if (!Number.isInteger(matchId)) {
            req.flash('error', 'Invalid request ID.');
            return res.redirect('/matches');
        }

        try {
            const [result] = await db.query(
                `UPDATE matches
                 SET status = 'rejected'
                 WHERE match_id = ?
                   AND teacher_id = ?
                   AND status = 'pending'`,
                [matchId, currentUserId]
            );

            if (result.affectedRows === 1) {
                req.flash(
                    'success',
                    'Exchange request rejected.'
                );
            } else {
                req.flash(
                    'error',
                    'This request cannot be rejected.'
                );
            }

            return res.redirect('/matches');
        } catch (error) {
            console.error(
                'Error rejecting exchange request:',
                error
            );

            req.flash(
                'error',
                'Unable to reject the request.'
            );

            return res.redirect('/matches');
        }
    }
);


/*
POST /matches/request/:id/cancel

The learner who created a pending request may cancel it.
*/
app.post(
    '/matches/request/:id/cancel',
    checkAuthenticated,
    async (req, res) => {
        const matchId = Number(req.params.id);

        const currentUserId = Number(
            req.session.user.user_id || req.session.user.id
        );

        if (!Number.isInteger(matchId)) {
            req.flash('error', 'Invalid request ID.');
            return res.redirect('/matches');
        }

        try {
            /*
            The matches table screenshot does not show "cancelled"
            as an allowed status. Deleting a pending request is therefore
            safer than storing an unsupported status value.
            */
            const [result] = await db.query(
                `DELETE FROM matches
                 WHERE match_id = ?
                   AND learner_id = ?
                   AND status = 'pending'`,
                [matchId, currentUserId]
            );

            if (result.affectedRows === 1) {
                req.flash(
                    'success',
                    'Exchange request cancelled.'
                );
            } else {
                req.flash(
                    'error',
                    'This request cannot be cancelled.'
                );
            }

            return res.redirect('/matches');
        } catch (error) {
            console.error(
                'Error cancelling exchange request:',
                error
            );

            req.flash(
                'error',
                'Unable to cancel the request.'
            );

            return res.redirect('/matches');
        }
    }
);


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
