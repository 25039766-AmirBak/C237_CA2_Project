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
const TEMP_TEST_USER_ID = 2;

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

    let sql = ' SELECT skills.id,skills.user_id,skills.skill_name,skills.category,skills.skill_level,skills.skill_type,skills.description, skills.availability,skills.location,skills.created_at,users.name AS owner_name FROM skills INNER JOIN users ON skills.user_id = users.id WHERE 1=1';

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
                    Member 3: MATCHING SYSTEM
********************************************************************/

// Convert text to lowercase so skill names can be compared reliably.
const normaliseMatchText = (value) => {
    return String(value || '').trim().toLowerCase();
};


/*
Compatibility route for Member 2's Match Skill button.

For example:
    /skills/1

Instead of showing "Cannot GET /skills/1", this redirects the user
to the matching page and selects that skill.
*/
app.get('/skills/:id', checkAuthenticated, (req, res) => {
    const skillId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(skillId) || skillId <= 0) {
        req.flash('error', 'Invalid skill selected.');
        return res.redirect('/skills');
    }

    return res.redirect(`/matches?skill_id=${skillId}`);
});


/*
GET /matches

Displays:
- Suggested matching partners
- Incoming requests
- Outgoing requests
- The current user's offered and wanted skills
*/
app.get('/matches', checkAuthenticated, async (req, res) => {
    const currentUserId = Number(req.session.user.id);
    const selectedSkillId = Number.parseInt(
        req.query.skill_id,
        10
    );

    try {
        /*
        Get the current user's skills.
        */
        const [mySkills] = await connection.promise().query(
            `SELECT
                id,
                user_id,
                skill_name,
                category,
                skill_level,
                skill_type,
                description,
                availability,
                location,
                created_at
             FROM skills
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [currentUserId]
        );

        const myOfferSkills = mySkills.filter((skill) => {
            return normaliseMatchText(skill.skill_type) === 'offer';
        });

        const myLearnSkills = mySkills.filter((skill) => {
            return normaliseMatchText(skill.skill_type) === 'learn';
        });


        /*
        Get Offer skills belonging to other users.

        This uses users.id and users.name because that is what
        Member 2's existing working code uses.
        */
        const [otherOfferSkills] =
            await connection.promise().query(
                `SELECT
                    skills.id,
                    skills.user_id,
                    skills.skill_name,
                    skills.category,
                    skills.skill_level,
                    skills.skill_type,
                    skills.description,
                    skills.availability,
                    skills.location,
                    skills.created_at,
                    users.name AS partner_name
                 FROM skills
                 INNER JOIN users
                    ON users.id = skills.user_id
                 WHERE skills.user_id <> ?
                   AND LOWER(skills.skill_type) = 'offer'
                 ORDER BY skills.created_at DESC`,
                [currentUserId]
            );


        /*
        Get the Learn skills belonging to other users.

        These are used to check whether the exchange is reciprocal.
        */
        const [otherLearnSkills] =
            await connection.promise().query(
                `SELECT
                    id,
                    user_id,
                    skill_name,
                    category,
                    skill_level,
                    availability,
                    location
                 FROM skills
                 WHERE user_id <> ?
                   AND LOWER(skill_type) = 'learn'`,
                [currentUserId]
            );


        const matches = [];

        for (const partnerOffer of otherOfferSkills) {
            /*
            Check whether this is the skill selected from Member 2's
            skill listing page.
            */
            const selectedFromSkillsPage =
                Number.isInteger(selectedSkillId) &&
                Number(partnerOffer.id) === selectedSkillId;

            /*
            Find whether the current user wants to learn this skill.
            */
            const matchingLearnSkill = myLearnSkills.find(
                (myLearnSkill) => {
                    return (
                        normaliseMatchText(
                            myLearnSkill.skill_name
                        ) ===
                        normaliseMatchText(
                            partnerOffer.skill_name
                        )
                    );
                }
            );

            /*
            Normally, only actual matches are displayed.

            However, when the user clicks Match Skill from Member 2's
            skill listing, that selected skill is also displayed.
            */
            if (!matchingLearnSkill && !selectedFromSkillsPage) {
                continue;
            }


            /*
            Find all skills the potential partner wants to learn.
            */
            const partnerLearnSkills = otherLearnSkills.filter(
                (partnerLearnSkill) => {
                    return (
                        Number(partnerLearnSkill.user_id) ===
                        Number(partnerOffer.user_id)
                    );
                }
            );


            /*
            Check whether the logged-in user offers a skill that
            the partner wants to learn.
            */
            const reciprocalOffer = myOfferSkills.find(
                (myOfferSkill) => {
                    return partnerLearnSkills.some(
                        (partnerLearnSkill) => {
                            return (
                                normaliseMatchText(
                                    partnerLearnSkill.skill_name
                                ) ===
                                normaliseMatchText(
                                    myOfferSkill.skill_name
                                )
                            );
                        }
                    );
                }
            ) || null;


            /*
            Check availability and location.
            */
            const availabilityMatches =
                Boolean(matchingLearnSkill) &&
                normaliseMatchText(
                    matchingLearnSkill.availability
                ) !== '' &&
                normaliseMatchText(
                    matchingLearnSkill.availability
                ) ===
                normaliseMatchText(
                    partnerOffer.availability
                );

            const locationMatches =
                Boolean(matchingLearnSkill) &&
                normaliseMatchText(
                    matchingLearnSkill.location
                ) !== '' &&
                normaliseMatchText(
                    matchingLearnSkill.location
                ) ===
                normaliseMatchText(
                    partnerOffer.location
                );


            /*
            Calculate match score.

            70%: User wants the skill
            20%: Reciprocal skill exchange
             5%: Same availability
             5%: Same location
            */
            let matchPercentage = matchingLearnSkill ? 70 : 50;

            if (reciprocalOffer) {
                matchPercentage += 20;
            }

            if (availabilityMatches) {
                matchPercentage += 5;
            }

            if (locationMatches) {
                matchPercentage += 5;
            }


            let matchLabel = 'Potential Match';

            if (matchPercentage >= 95) {
                matchLabel = 'Excellent Match';
            } else if (matchPercentage >= 85) {
                matchLabel = 'Strong Match';
            } else if (matchPercentage >= 70) {
                matchLabel = 'Good Match';
            }


            matches.push({
                partner_id: partnerOffer.user_id,
                partner_name:
                    partnerOffer.partner_name || 'SkillSwap User',

                requested_skill_id: partnerOffer.id,
                requested_skill_name:
                    partnerOffer.skill_name,
                requested_skill_level:
                    partnerOffer.skill_level,

                category: partnerOffer.category,
                description: partnerOffer.description,
                availability: partnerOffer.availability,
                location: partnerOffer.location,

                reciprocal_offer_id:
                    reciprocalOffer
                        ? reciprocalOffer.id
                        : null,

                reciprocal_offer_name:
                    reciprocalOffer
                        ? reciprocalOffer.skill_name
                        : null,

                user_wants_skill: Boolean(matchingLearnSkill),
                selected_from_skills_page:
                    selectedFromSkillsPage,

                availability_matches:
                    availabilityMatches,

                location_matches:
                    locationMatches,

                match_percentage:
                    Math.min(matchPercentage, 100),

                match_label: matchLabel
            });
        }


        /*
        Sort:
        1. Skill selected from Member 2's page
        2. Highest match percentage
        3. Partner name
        */
        matches.sort((firstMatch, secondMatch) => {
            if (
                firstMatch.selected_from_skills_page !==
                secondMatch.selected_from_skills_page
            ) {
                return firstMatch.selected_from_skills_page
                    ? -1
                    : 1;
            }

            if (
                secondMatch.match_percentage !==
                firstMatch.match_percentage
            ) {
                return (
                    secondMatch.match_percentage -
                    firstMatch.match_percentage
                );
            }

            return firstMatch.partner_name.localeCompare(
                secondMatch.partner_name
            );
        });


        /*
        Incoming requests:
        Another learner wants to learn from the current user.
        */
        const [incomingRequests] =
            await connection.promise().query(
                `SELECT
                    matches.match_id AS id,
                    matches.learner_id AS requester_id,
                    matches.teacher_id AS partner_id,
                    matches.skill_id,
                    matches.status,
                    matches.matched_at AS created_at,
                    users.name AS requester_name,
                    skills.skill_name AS requested_skill_name
                 FROM matches
                 INNER JOIN users
                    ON users.id = matches.learner_id
                 INNER JOIN skills
                    ON skills.id = matches.skill_id
                 WHERE matches.teacher_id = ?
                 ORDER BY matches.matched_at DESC`,
                [currentUserId]
            );


        /*
        Outgoing requests:
        Requests created by the current user.
        */
        const [outgoingRequests] =
            await connection.promise().query(
                `SELECT
                    matches.match_id AS id,
                    matches.learner_id AS requester_id,
                    matches.teacher_id AS partner_id,
                    matches.skill_id,
                    matches.status,
                    matches.matched_at AS created_at,
                    users.name AS partner_name,
                    skills.skill_name AS requested_skill_name
                 FROM matches
                 INNER JOIN users
                    ON users.id = matches.teacher_id
                 INNER JOIN skills
                    ON skills.id = matches.skill_id
                 WHERE matches.learner_id = ?
                 ORDER BY matches.matched_at DESC`,
                [currentUserId]
            );


        return res.render('matches', {
            pageTitle: 'Skill Matches',
            activePage: 'Matches',
            user: req.session.user,
            currentUserId,
            matches,
            myOfferSkills,
            myLearnSkills,
            incomingRequests,
            outgoingRequests,
            selectedSkillId:
                Number.isInteger(selectedSkillId)
                    ? selectedSkillId
                    : null,
            success:
                req.flash('success')[0] || null,
            error:
                req.flash('error')[0] || null
        });
    } catch (error) {
        console.error('Error loading matches:', error);

        return res.status(500).send(
            'Unable to load skill matches. Check the terminal for details.'
        );
    }
});


/*
POST /matches/request

Creates a pending skill exchange request.
*/
app.post(
    '/matches/request',
    checkAuthenticated,
    async (req, res) => {
        const learnerId = Number(req.session.user.id);
        const teacherId = Number(req.body.partner_id);
        const requestedSkillId = Number(
            req.body.requested_skill_id
        );

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
                'You cannot send a request to yourself.'
            );

            return res.redirect('/matches');
        }

        try {
            /*
            Confirm the skill exists, belongs to the selected teacher
            and is an Offer listing.
            */
            const [requestedSkills] =
                await connection.promise().query(
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
                    'This skill is no longer available.'
                );

                return res.redirect('/matches');
            }


            /*
            Prevent duplicate pending requests.
            */
            const [duplicateRequests] =
                await connection.promise().query(
                    `SELECT match_id
                     FROM matches
                     WHERE learner_id = ?
                       AND teacher_id = ?
                       AND skill_id = ?
                       AND status = 'pending'`,
                    [
                        learnerId,
                        teacherId,
                        requestedSkillId
                    ]
                );

            if (duplicateRequests.length > 0) {
                req.flash(
                    'error',
                    'You have already requested this skill.'
                );

                return res.redirect('/matches');
            }


            await connection.promise().query(
                `INSERT INTO matches
                    (
                        learner_id,
                        teacher_id,
                        skill_id,
                        status,
                        matched_at
                    )
                 VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
                [
                    learnerId,
                    teacherId,
                    requestedSkillId
                ]
            );

            req.flash(
                'success',
                'Skill exchange request sent successfully.'
            );

            return res.redirect('/matches');
        } catch (error) {
            console.error(
                'Error sending exchange request:',
                error
            );

            req.flash(
                'error',
                'Unable to send the exchange request.'
            );

            return res.redirect('/matches');
        }
    }
);


/*
POST /matches/request/:id/accept
*/
app.post(
    '/matches/request/:id/accept',
    checkAuthenticated,
    async (req, res) => {
        const matchId = Number(req.params.id);
        const currentUserId = Number(req.session.user.id);

        if (!Number.isInteger(matchId)) {
            req.flash('error', 'Invalid request ID.');
            return res.redirect('/matches');
        }

        try {
            const [result] =
                await connection.promise().query(
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
                'Error accepting request:',
                error
            );

            req.flash(
                'error',
                'Unable to accept this request.'
            );

            return res.redirect('/matches');
        }
    }
);


/*
POST /matches/request/:id/reject
*/
app.post(
    '/matches/request/:id/reject',
    checkAuthenticated,
    async (req, res) => {
        const matchId = Number(req.params.id);
        const currentUserId = Number(req.session.user.id);

        if (!Number.isInteger(matchId)) {
            req.flash('error', 'Invalid request ID.');
            return res.redirect('/matches');
        }

        try {
            const [result] =
                await connection.promise().query(
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
                'Error rejecting request:',
                error
            );

            req.flash(
                'error',
                'Unable to reject this request.'
            );

            return res.redirect('/matches');
        }
    }
);


/*
POST /matches/request/:id/cancel
*/
app.post(
    '/matches/request/:id/cancel',
    checkAuthenticated,
    async (req, res) => {
        const matchId = Number(req.params.id);
        const currentUserId = Number(req.session.user.id);

        if (!Number.isInteger(matchId)) {
            req.flash('error', 'Invalid request ID.');
            return res.redirect('/matches');
        }

        try {
            const [result] =
                await connection.promise().query(
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
                'Error cancelling request:',
                error
            );

            req.flash(
                'error',
                'Unable to cancel this request.'
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));