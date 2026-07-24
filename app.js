const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const bcrypt = require('bcrypt');

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

// Promise-based wrapper so we can use async/await with mysql2
const db = connection.promise();

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
    secret: process.env.SESSION_SECRET || 'skill-swap-development-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        sameSite: 'lax'
    }
}));
app.use(flash());

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }

    req.flash('error', 'Please log in to continue.');
    return res.redirect('/login');
};

const checkGuest = (req, res, next) => {
    if (!req.session.user) {
        return next();
    }

    return res.redirect('/profile');
};

const checkAdmin = (req, res, next) => {
    if (
        req.session.user &&
        req.session.user.role === 'admin'
    ) {
        return next();
    }

    req.flash('error', 'Access denied.');
    return res.redirect('/');
};

app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    res.locals.successMessages = req.flash('success');
    res.locals.errorMessages = req.flash('error');
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
const getRegistrationData = (body = {}) => {
    return {
        name: body.name ? body.name.trim() : '',
        email: body.email
            ? body.email.trim().toLowerCase()
            : '',
        contact: body.contact ? body.contact.trim() : '',
        bio: body.bio ? body.bio.trim() : ''
    };
};

const validateRegistrationData = (
    formData,
    password,
    confirmPassword
) => {
    if (
        !formData.name ||
        !formData.email ||
        !password ||
        !confirmPassword ||
        !formData.contact
    ) {
        return 'Please complete all required fields.';
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(formData.email)) {
        return 'Please enter a valid email address.';
    }

    if (password.length < 6) {
        return 'Password must contain at least 6 characters.';
    }

    if (password !== confirmPassword) {
        return 'Passwords do not match.';
    }

    if (formData.name.length > 100) {
        return 'Name cannot exceed 100 characters.';
    }

    if (formData.contact.length > 30) {
        return 'Contact number cannot exceed 30 characters.';
    }

    if (formData.bio.length > 500) {
        return 'Bio cannot exceed 500 characters.';
    }

    return null;
};

app.get('/register', checkGuest, (req, res) => {
    return res.render('register', {
        pageTitle: 'Register',
        error: null,
        formData: {}
    });
});

app.post('/register', checkGuest, async (req, res) => {
    console.log(req.body);

    const formData = getRegistrationData(req.body);
    const password = req.body.password || '';
    const confirmPassword = req.body.confirm_password || '';
    const validationError = validateRegistrationData(formData,password,confirmPassword);

    if (validationError) {
        return res.status(400).render('register', {
            pageTitle: 'Register',
            error: validationError,
            formData
        });
    }

    try {
        const [existingUsers] =
            await connection.promise().query(
                ' SELECT id FROM users WHERE email = ? LIMIT 1',[formData.email]
            );

        if (existingUsers.length > 0) {
            return res.status(409).render('register', {
                pageTitle: 'Register',
                error:
                    'An account with this email already exists.',
                formData
            });
        }

        const hashedPassword = await bcrypt.hash(password,12);

        const role = formData.email.toLowerCase() === 'admin@gmail.com' ? 'admin' : 'user';

        const [result] =
            await connection.promise().query(
                'INSERT INTO users (name,email,password,contact,bio,role,points,level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    formData.name,
                    formData.email,
                    hashedPassword,
                    formData.contact,
                    formData.bio || null,
                    role,
                    0,
                    1
                ]
            );

        req.session.user = {
            id: result.insertId,
            name: formData.name,
            email: formData.email,
            role: role
        };

        return req.session.save((sessionError) => {
            if (sessionError) {
                console.error('Unable to save registration session:',sessionError);

                return res.status(500).render(
                    'register',
                    {
                        pageTitle: 'Register',
                        error:
                            'Account created, but automatic login failed. Please log in.',
                        formData
                    }
                );
            }
            return res.redirect('/profile');
        });

    } catch (error) {
        console.error('Registration error:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).render('register', {
                pageTitle: 'Register',
                error:
                    'An account with this email already exists.',
                formData
            });
        }

        return res.status(500).render('register', {
            pageTitle: 'Register',
            error:
                'Unable to create your account. Please try again.',
            formData
        });
    }
});

app.get('/login', checkGuest, (req, res) => {
    return res.render('login', {
        pageTitle: 'Login',
        error: req.flash('error')[0] || null,
        success: req.flash('success')[0] || null,
        formData: {}
    });
});

app.post('/login', checkGuest, async (req, res) => {
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password || '';
    const formData = {email};

    if (!email || !password) {
        return res.status(400).render('login', {
            pageTitle: 'Login',
            error:
                'Please enter your email and password.',
            success: null,
            formData
        });
    }

    try {
        const [users] =
            await connection.promise().query(
                ' SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1',[email]
            );

        if (users.length === 0) {
            return res.status(401).render('login', {
                pageTitle: 'Login',
                error:
                    'Incorrect email or password.',
                success: null,
                formData
            });
        }

        const user = users[0];

        const passwordMatches = await bcrypt.compare( password,user.password);
        if (!passwordMatches) {
            return res.status(401).render('login', {
                pageTitle: 'Login',
                error:
                    'Incorrect email or password.',
                success: null,
                formData
            });
        }

        return req.session.regenerate(
            (regenerateError) => {
                if (regenerateError) {
                    console.error('Unable to regenerate session:',regenerateError);

                    return res.status(500).render(
                        'login',
                        {
                            pageTitle: 'Login',
                            error:
                                'Unable to log in. Please try again.',
                            success: null,
                            formData
                        }
                    );
                }

                req.session.user = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                };

                return req.session.save(
                    (saveError) => {
                        if (saveError) {
                            console.error(
                                'Unable to save login session:',
                                saveError
                            );

                            return res
                                .status(500)
                                .render('login', {
                                    pageTitle:
                                        'Login',
                                    error:
                                        'Unable to log in. Please try again.',
                                    success: null,
                                    formData
                                });
                        }

                        if (user.role === 'admin') {
                            return res.redirect(
                                '/admin'
                            );
                        }

                        return res.redirect(
                            '/profile'
                        );
                    }
                );
            }
        );
    } catch (error) {
        console.error('Login error:', error);

        return res.status(500).render('login', {
            pageTitle: 'Login',
            error:
                'Unable to log in. Please try again.',
            success: null,
            formData
        });
    }
});

app.post('/logout',checkAuthenticated,(req, res) => {
    req.session.destroy((error) => {
            if (error) {
                console.error('Logout error:',error);

                return res
                    .status(500)
                    .send('Unable to log out.');
            }

            res.clearCookie('connect.sid');

            return res.redirect('/login');
        });
    }
);


app.get(
    '/profile',
    checkAuthenticated,
    async (req, res) => {
        const userId = req.session.user.id;

        try {
            const [users] =
                await connection.promise().query(
                    ' SELECT id, name, email,contact, bio,role,points,level FROM users WHERE id = ? LIMIT 1',[userId]
                );

            if (users.length === 0) {
                req.session.destroy(() => {});

                return res.redirect('/login');
            }

            const [skills] =
                await connection.promise().query(
                    ' SELECT id, skill_name, category, skill_level, skill_type, description,availability,location,created_at FROM skills WHERE user_id = ? ORDER BY created_at DESC',[userId]
                );

            const offerSkills = skills.filter(
                (skill) => {
                    return (
                        String(
                            skill.skill_type
                        ).toLowerCase() ===
                        'offer'
                    );
                }
            );

            const learnSkills = skills.filter(
                (skill) => {
                    return (
                        String(
                            skill.skill_type
                        ).toLowerCase() ===
                        'learn'
                    );
                }
            );

            return res.render('profile', {
                pageTitle: 'My Profile',
                user: users[0],
                offerSkills,
                learnSkills,
                editing: false,
                success:
                    req.flash('success')[0] ||
                    null,
                error:
                    req.flash('error')[0] ||
                    null
            });
        } catch (error) {
            console.error(
                'Profile error:',
                error
            );

            return res
                .status(500)
                .send(
                    'Unable to retrieve your profile.'
                );
        }
    }
);

app.get('/profile/edit',checkAuthenticated,async (req, res) => {
        try {
            const [users] =
                await connection.promise().query(
                    ' SELECT id, name,email,contact,bio,role,points,level FROM users WHERE id = ? LIMIT 1',[req.session.user.id]
                );

            if (users.length === 0) {
                req.session.destroy(() => {});

                return res.redirect('/login');
            }

            return res.render('profile', {
                pageTitle: 'Edit Profile',
                user: users[0],
                offerSkills: [],
                learnSkills: [],
                editing: true,
                success: null,
                error:
                    req.flash('error')[0] ||
                    null
            });
        } catch (error) {
            console.error('Edit profile page error:',error
            );

            return res
                .status(500)
                .send(
                    'Unable to retrieve your profile.'
                );
        }
    }
);

app.post('/profile/edit',checkAuthenticated, async (req, res) => {
        const userId = req.session.user.id;
        const name = req.body.name ? req.body.name.trim() : '';
        const contact = req.body.contact ? req.body.contact.trim() : '';

        const bio = req.body.bio ? req.body.bio.trim() : '';

        if (!name || !contact) {
            req.flash('error', 'Name and contact number are required.'
            );

            return res.redirect('/profile/edit');
        }

        if (name.length > 100) {
            req.flash('error', 'Name cannot exceed 100 characters.'
            );

            return res.redirect('/profile/edit');
        }

        if (contact.length > 30) {
            req.flash('error', 'Contact number cannot exceed 30 characters.'
            );

            return res.redirect('/profile/edit');
        }

        if (bio.length > 500) {
            req.flash('error', 'Bio cannot exceed 500 characters.'
            );

            return res.redirect('/profile/edit');
        }

        try {
            const [users] =
                await connection.promise().query(
                    'SELECT id FROM users WHERE id = ? LIMIT 1',[userId]
                );

            if (users.length === 0) {
                req.session.destroy(() => {});

                return res.redirect('/login');
            }

            await connection.promise().query(
                `
                UPDATE users
                SET
                    name = ?,
                    contact = ?,
                    bio = ?
                WHERE id = ?
                `,
                [
                    name,
                    contact,
                    bio || null,
                    userId
                ]
            );

            req.session.user.name = name;

            req.flash('success','Profile updated successfully.'
            );

            return req.session.save(
                (sessionError) => {
                    if (sessionError) {
                        console.error(
                            'Profile session update error:',
                            sessionError
                        );
                    }

                    return res.redirect('/profile');
                }
            );
        } catch (error) {
            console.error('Profile update error:',error
            );

            req.flash('error','Unable to update your profile.'
            );

            return res.redirect('/profile/edit');
        }
    }
);

app.get('/admin',checkAuthenticated,checkAdmin,async (req, res) => {
        try {
            const [
                userCountRows,
                skillCountRows,
                matchCountRows,
                sessionCountRows
            ] = await Promise.all([
                db.query(
                    `
                    SELECT COUNT(*) AS total
                    FROM users
                    `
                ),

                db.query(
                    `
                    SELECT COUNT(*) AS total
                    FROM skills
                    `
                ),

                db.query(
                    `
                    SELECT COUNT(*) AS total
                    FROM matches
                    `
                ),

                db.query(
                    `
                    SELECT COUNT(*) AS total
                    FROM sessions
                    `
                )
            ]);

            const [users] = await db.query(
                `
                SELECT
                    id,
                    name,
                    email,
                    contact,
                    role,
                    points,
                    level,
                    created_at
                FROM users
                ORDER BY created_at DESC
                `
            );

            const [skills] = await db.query(
                `
                SELECT
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
                    users.name AS owner_name
                FROM skills
                INNER JOIN users
                    ON users.id = skills.user_id
                ORDER BY skills.created_at DESC
                `
            );

            const statistics = {
                totalUsers:
                    Number(userCountRows[0][0].total || 0),

                totalSkills:
                    Number(skillCountRows[0][0].total || 0),

                totalMatches:
                    Number(matchCountRows[0][0].total || 0),

                totalSessions:
                    Number(sessionCountRows[0][0].total || 0)
            };

            return res.render('admin', {
                pageTitle: 'Admin Dashboard',
                statistics,
                users,
                skills
            });
        } catch (error) {
            console.error('Admin dashboard error:',error
            );

            req.flash('error','Unable to load the admin dashboard.'
            );

            return res.redirect('/');
        }
    }
);

app.post('/admin/skills/:id/delete',checkAuthenticated,checkAdmin,async (req, res) => {
        const skillId = Number.parseInt(req.params.id,10);

        if (
            !Number.isInteger(skillId) ||skillId <= 0
        ) {
            req.flash('error','Invalid skill ID.'
            );

            return res.redirect('/admin');
        }

        try {
            const [result] = await db.query(
                ` DELETE FROM skills WHERE id = ?`,
                [skillId]
            );

            if (result.affectedRows === 0) {
                req.flash('error','Skill listing not found.'
                );
            } else {
                req.flash('success','Skill listing deleted successfully.'
                );
            }

            return res.redirect('/admin');
        } catch (error) {
            console.error('Admin delete skill error:',error
            );

            req.flash('error','Unable to delete the skill. It may be linked to a match or session.'
            );

            return res.redirect('/admin');
        }
    }
);



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
            currentUserId: req.session.user ? req.session.user.id : null
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
app.get("/skills/success/:id", checkAuthenticated,(req, res) => {
    const userId = req.session.user.id;
    const skillId = Number.parseInt(req.params.id,10);

    if (
        !Number.isInteger(skillId) ||
            skillId <= 0
    ) {
        return res.status(400).send('Invalid skill ID.');
    }

    const sql = 'SELECT id,skill_name,category,skill_level,skill_type,description,availability,location FROM skills WHERE id = ? AND user_id = ? LIMIT 1';

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
app.get('/my-skills', checkAuthenticated, (req, res) => {
    return res.redirect('/profile');
    }
);

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
            req.flash('error', 'Skill not found or you do not own this skill.');
            return res.redirect('/my-skills');
        }

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
    const skill = {
        id: skillId,
        ...formData 
    };

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

        return res.redirect("/profile");
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

                return res.redirect('/profile');
            }

            if (result.affectedRows === 0) {
                req.flash(
                    "error",
                    "Skill not found or you do not own this listing."
                );

                return res.redirect("/profile");}

                req.flash(
                    'success',
                    'Skill deleted successfully.'
                );

                return res.redirect('/profile');
        });
    }
);

/********************************************************************
                    Member 3: MATCHING SYSTEM
********************************************************************/
// Convert text to lowercase so skill names can be compared reliably.
const normaliseMatchText = (value) => {
    return String(value || '')
        .toLowerCase()
        .replace(/c\+\+/g, 'cplusplus')
        .replace(/c#/g, 'csharp')
        .replace(/\.net/g, ' dotnet')
        .replace(/node\.js/g, 'nodejs')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
};

/*
Convert a skill name into meaningful keywords.

Examples:
"UI/UX Design" becomes ["ui", "ux", "design"]
"JavaScript Programming" becomes
["javascript", "programming"]
*/
const getSkillKeywords = (skillName) => {
    return normaliseMatchText(skillName)
        .split(' ')
        .filter((word) => word.length >= 2);
};

/*
Check whether two skill names have a partial keyword match.

A partial match is valid when:
1. The skill names are not an exact match.
2. Every keyword from the shorter skill name appears as a
   complete keyword in the longer skill name.

Examples:
"UI" ↔ "UI/UX Design"
"JavaScript" ↔ "JavaScript Programming"
"UX Design" ↔ "UI/UX Design"
*/
const hasPartialSkillMatch = (
    firstSkillName,
    secondSkillName
) => {
    const firstName = normaliseMatchText(firstSkillName);
    const secondName = normaliseMatchText(secondSkillName);

    if (!firstName || !secondName || firstName === secondName) {
        return false;
    }

    const firstKeywords = getSkillKeywords(firstName);
    const secondKeywords = getSkillKeywords(secondName);

    if (
        firstKeywords.length === 0 ||
        secondKeywords.length === 0
    ) {
        return false;
    }

    const shorterKeywords =
        firstKeywords.length <= secondKeywords.length
            ? firstKeywords
            : secondKeywords;

    const longerKeywords =
        firstKeywords.length <= secondKeywords.length
            ? secondKeywords
            : firstKeywords;

    return shorterKeywords.every((keyword) =>
        longerKeywords.includes(keyword)
    );
};

/*
Return the strongest skill compatibility only.

Priority:
1. Exact match: 60%
2. Partial keyword match: 45%
3. Same category: 30%
4. No compatibility: 0%
*/
const getSkillCompatibility = (
    learnSkill,
    offerSkill
) => {
    if (!learnSkill || !offerSkill) {
        return {
            score: 0,
            type: 'No Skill Match',
            code: 'none'
        };
    }

    const learnName = normaliseMatchText(
        learnSkill.skill_name
    );
    const offerName = normaliseMatchText(
        offerSkill.skill_name
    );

    if (learnName && learnName === offerName) {
        return {
            score: 60,
            type: 'Exact Match',
            code: 'exact'
        };
    }

    if (
        hasPartialSkillMatch(
            learnSkill.skill_name,
            offerSkill.skill_name
        )
    ) {
        return {
            score: 45,
            type: 'Partial Match',
            code: 'partial'
        };
    }

    const learnCategory = normaliseMatchText(
        learnSkill.category
    );
    const offerCategory = normaliseMatchText(
        offerSkill.category
    );

    if (
        learnCategory &&
        learnCategory === offerCategory
    ) {
        return {
            score: 30,
            type: 'Category Match',
            code: 'category'
        };
    }

    return {
        score: 0,
        type: 'No Skill Match',
        code: 'none'
    };
};

/*
Find the current user's strongest Learn skill for one
partner Offer skill.
*/
const findBestLearnSkillMatch = (
    learnSkills,
    partnerOffer
) => {
    let bestResult = {
        learnSkill: null,
        compatibility: {
            score: 0,
            type: 'No Skill Match',
            code: 'none'
        }
    };

    for (const learnSkill of learnSkills) {
        const compatibility = getSkillCompatibility(
            learnSkill,
            partnerOffer
        );

        if (
            compatibility.score >
            bestResult.compatibility.score
        ) {
            bestResult = {
                learnSkill,
                compatibility
            };
        }
    }

    return bestResult;
};

/*
Reciprocal exchange remains strict.

The +20% is awarded only when the partner wants the exact
skill currently offered by the logged-in user.
*/
const findReciprocalOffer = (
    myOfferSkills,
    partnerLearnSkills
) => {
    return myOfferSkills.find((myOfferSkill) => {
        return partnerLearnSkills.some(
            (partnerLearnSkill) => {
                return (
                    normaliseMatchText(
                        myOfferSkill.skill_name
                    ) ===
                    normaliseMatchText(
                        partnerLearnSkill.skill_name
                    )
                );
            }
        );
    }) || null;
};

/*
Flexible availability matches every availability option.

Examples:
Flexible ↔ Weekdays
Flexible ↔ Weekends
Flexible ↔ Evenings
Flexible ↔ Flexible
*/
const availabilityIsCompatible = (
    firstAvailability,
    secondAvailability
) => {
    const first = normaliseMatchText(firstAvailability);
    const second = normaliseMatchText(secondAvailability);

    if (!first || !second) {
        return false;
    }

    return (
        first === second ||
        first === 'flexible' ||
        second === 'flexible'
    );
};

/*
Generate the descriptive label shown on each match card.
*/
const getMatchLabel = (percentage) => {
    if (percentage >= 90) {
        return 'Excellent Match';
    }
    if (percentage >= 75) {
        return 'Strong Match';
    }
    if (percentage >= 60) {
        return 'Good Match';
    }
    if (percentage >= 30) {
        return 'Potential Match';
    }

    return 'Selected Skill';
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
            return (
                normaliseMatchText(skill.skill_type) ===
                'offer'
            );
        });

        const myLearnSkills = mySkills.filter((skill) => {
            return (
                normaliseMatchText(skill.skill_type) ===
                'learn'
            );
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
            Find the strongest compatibility between this partner's
            Offer skill and all the current user's Learn skills.
            */
            const bestSkillMatch = findBestLearnSkillMatch(
                myLearnSkills,
                partnerOffer
            );

            const matchingLearnSkill =
                bestSkillMatch.learnSkill;
            const skillCompatibility =
                bestSkillMatch.compatibility;

            /*
            Normally, only compatible skills are displayed.

            A skill selected using Member 2's Match Skill button is
            still displayed even when it is not currently in the
            user's Learn list.
            */
            if (
                skillCompatibility.score === 0 &&
                !selectedFromSkillsPage
            ) {
                continue;
            }

            /*
            Get all Learn skills belonging to this potential partner.
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
            Check for a strict reciprocal exchange.
            */
            const reciprocalOffer = findReciprocalOffer(
                myOfferSkills,
                partnerLearnSkills
            );

            /*
            Availability and location are compared against the current
            user's Learn listing that produced the strongest skill match.
            */
            const availabilityMatches =
                Boolean(matchingLearnSkill) &&
                availabilityIsCompatible(
                    matchingLearnSkill.availability,
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
            Calculate the final score.

            Only one skill score is used:
            - Exact: 60
            - Partial: 45
            - Category: 30

            Additional factors:
            - Reciprocal exchange: +20
            - Availability: +10
            - Location: +10
            */
            const skillScore = skillCompatibility.score;

            const reciprocalScore =
                reciprocalOffer ? 20 : 0;

            const availabilityScore =
                availabilityMatches ? 10 : 0;

            const locationScore =
                locationMatches ? 10 : 0;

            const matchPercentage = Math.min(
                skillScore +
                reciprocalScore +
                availabilityScore +
                locationScore,
                100
            );

            const matchLabel = getMatchLabel(
                matchPercentage
            );


            matches.push({
                partner_id: partnerOffer.user_id,

                partner_name:
                    partnerOffer.partner_name ||
                    'SkillSwap User',

                requested_skill_id:
                    partnerOffer.id,

                requested_skill_name:
                    partnerOffer.skill_name,

                requested_skill_level:
                    partnerOffer.skill_level,

                category:
                    partnerOffer.category,

                description:
                    partnerOffer.description,

                availability:
                    partnerOffer.availability,

                location:
                    partnerOffer.location,

                reciprocal_offer_id:
                    reciprocalOffer
                        ? reciprocalOffer.id
                        : null,

                reciprocal_offer_name:
                    reciprocalOffer
                        ? reciprocalOffer.skill_name
                        : null,

                matched_learn_skill_name:
                    matchingLearnSkill
                        ? matchingLearnSkill.skill_name
                        : null,

                skill_match_type:
                    selectedFromSkillsPage &&
                    skillCompatibility.score === 0
                        ? 'Selected Skill'
                        : skillCompatibility.type,

                skill_match_code:
                    skillCompatibility.code,

                skill_score:
                    skillScore,

                reciprocal_score:
                    reciprocalScore,

                availability_score:
                    availabilityScore,

                location_score:
                    locationScore,

                user_wants_skill:
                    skillCompatibility.score > 0,

                selected_from_skills_page:
                    selectedFromSkillsPage,

                availability_matches:
                    availabilityMatches,

                location_matches:
                    locationMatches,

                match_percentage:
                    matchPercentage,

                match_label:
                    matchLabel
            });
        }


        /*
        Remove duplicate recommendations.

        A duplicate means the same partner is offering the same
        normalised skill more than once. The highest-scoring result
        is kept.
        */
        const uniqueMatches = new Map();

        for (const match of matches) {
            const duplicateKey = [
                Number(match.partner_id),
                normaliseMatchText(
                    match.requested_skill_name
                )
            ].join(':');

            const existingMatch =
                uniqueMatches.get(duplicateKey);

            if (
                !existingMatch ||
                match.match_percentage >
                    existingMatch.match_percentage ||
                match.selected_from_skills_page
            ) {
                uniqueMatches.set(
                    duplicateKey,
                    match
                );
            }
        }

        matches.length = 0;
        matches.push(...uniqueMatches.values());


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
        console.error(
            'Error loading matches:',
            error
        );

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
        const learnerId = Number(
            req.session.user.id
        );

        const teacherId = Number(
            req.body.partner_id
        );

        const requestedSkillId = Number(
            req.body.requested_skill_id
        );

        if (
            !Number.isInteger(learnerId) ||
            !Number.isInteger(teacherId) ||
            !Number.isInteger(requestedSkillId)
        ) {
            req.flash(
                'error',
                'Invalid exchange request.'
            );

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
            Confirm the skill exists, belongs to the selected
            teacher and is an Offer listing.
            */
            const [requestedSkills] =
                await connection.promise().query(
                    `SELECT
                        id
                     FROM skills
                     WHERE id = ?
                       AND user_id = ?
                       AND LOWER(skill_type) = 'offer'`,
                    [
                        requestedSkillId,
                        teacherId
                    ]
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
                    `SELECT
                        match_id
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
                 VALUES (
                    ?,
                    ?,
                    ?,
                    'pending',
                    CURRENT_TIMESTAMP
                 )`,
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

Allows only the teacher receiving the request to accept it.
*/
app.post(
    '/matches/request/:id/accept',
    checkAuthenticated,
    async (req, res) => {
        const matchId = Number(
            req.params.id
        );
        const currentUserId = Number(
            req.session.user.id
        );

        if (
            !Number.isInteger(matchId) ||
            matchId <= 0
        ) {
            req.flash(
                'error',
                'Invalid request ID.'
            );
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
                    [
                        matchId,
                        currentUserId
                    ]
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

Allows only the teacher receiving the request to reject it.
*/
app.post(
    '/matches/request/:id/reject',
    checkAuthenticated,
    async (req, res) => {
        const matchId = Number(
            req.params.id
        );
        const currentUserId = Number(
            req.session.user.id
        );

        if (
            !Number.isInteger(matchId) ||
            matchId <= 0
        ) {
            req.flash(
                'error',
                'Invalid request ID.'
            );
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
                    [
                        matchId,
                        currentUserId
                    ]
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

Allows only the learner who sent the request to cancel it.
*/
app.post(
    '/matches/request/:id/cancel',
    checkAuthenticated,
    async (req, res) => {
        const matchId = Number(
            req.params.id
        );
        const currentUserId = Number(
            req.session.user.id
        );

        if (
            !Number.isInteger(matchId) ||
            matchId <= 0
        ) {
            req.flash(
                'error',
                'Invalid request ID.'
            );
            return res.redirect('/matches');
        }

        try {
            const [result] =
                await connection.promise().query(
                    `DELETE FROM matches
                     WHERE match_id = ?
                       AND learner_id = ?
                       AND status = 'pending'`,
                    [
                        matchId,
                        currentUserId
                    ]
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
// awardXP adds points to the user's total, the checks for a level up.
// COALESCE handles users who have NULL points (new users).
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

// checkLevelUp reads the user's current points and level.
// Each level requires (level * 100) total XP to advance. (For example, reaching level 2 requires 200 total XP.)
// The user's XP total is NOT reset on level up — it keeps accumulating toward the next level.
// Note: accumulating enough XP to skip multiple levels is not handled.
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

// awardBadge grants a single badge to a user if they do not already have it. Uses a two-step lookup
// Step 1: resolve badge_name → badge_id from the badges table.
// Step 2: check user_badges for an existing row; insert if absent.
// This prevents duplicate badge entries.
function awardBadge(userId, badgeName) {
    connection.query(
        'SELECT badge_id FROM badges WHERE badge_name = ?',
        [badgeName],
        (err, badgeRows) => {
            if (err || badgeRows.length === 0) {
                if (err) console.error('Error finding badge:', err);
                return;
            }
            const badgeId = badgeRows[0].badge_id;
            // Check if this badge is already earned by the user.
            // If it is, skip the insert to avoid duplicates.
            connection.query(
                'SELECT user_badge_id FROM user_badges WHERE user_id = ? AND badge_id = ?',
                [userId, badgeId],
                (err, rows) => {
                    if (err) {
                        console.error('Error checking badge:', err);
                        return;
                    }
                    if (rows.length > 0) return;
                    // Insert the badge using the foreign key badge_id
                    connection.query(
                        'INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)',
                        [userId, badgeId]
                    );
                }
            );
        }
    );
}

// checkAndAwardBadges counts completed sessions and awards badges based on milestone thresholds.
// First query: total sessions where the user participated (as either learner or teacher). Awards badges at 1, 5, 10, 20.
// Second query: sessions where the user was the teacher. Awards the 'Top Teacher' badge at 5 sessions taught.
function checkAndAwardBadges(userId) {
    connection.query(
        'SELECT COUNT(*) AS total FROM sessions WHERE (learner_id = ? OR teacher_id = ?) AND status = "completed"',
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
        'SELECT COUNT(*) AS count FROM sessions WHERE teacher_id = ? AND status = "completed"',
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

// Protected route that gathers all data needed by badges.ejs:
// 1. User's current XP and level (from users table)
// 2. XP required for the next level (level * 100)
// 3. Total completed exchanges (sessions where user is learner or teacher)
// 4. Completed exchanges where user was the teacher
// 5. Set of badge names the user has already earned (via JOIN query)

// All is passed to badges.ejs which renders the progress bar, stats card, and badge cards (earned vs locked).
app.get('/badges', checkAuthenticated, (req, res) => {
    const userId = req.session.user.id;

    // Step 1: Get user's current points and level
    connection.query('SELECT points, level FROM users WHERE id = ?', [userId], (err, userRows) => {
        if (err || userRows.length === 0) {
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

        // Step 2: Count total completed exchanges (as learner or teacher)
        connection.query(
            'SELECT COUNT(*) AS total FROM sessions WHERE (learner_id = ? OR teacher_id = ?) AND status = "completed"',
            [userId, userId],
            (err, exchangeRows) => {
                const totalExchanges = exchangeRows ? exchangeRows[0].total : 0;

                // Step 3: Count completed exchanges as teacher
                connection.query(
                    'SELECT COUNT(*) AS count FROM sessions WHERE teacher_id = ? AND status = "completed"',
                    [userId],
                    (err, teacherRows) => {
                        const teacherExchanges = teacherRows ? teacherRows[0].count : 0;

                        // Step 4: Get list of badge names the user has earned
                        // Joins user_badges with badges to resolve badge_id → badge_name
                        connection.query(
                            'SELECT badges.badge_name FROM user_badges INNER JOIN badges ON badges.badge_id = user_badges.badge_id WHERE user_badges.user_id = ?',
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
// ---------------------------------------------------------
// MESSAGING
// ---------------------------------------------------------

// GET /messages - inbox: list of conversations, and (if ?with=<id>
// is present) the message thread with that user
app.get('/messages', checkAuthenticated, async (req, res) => {
    const currentUserId = Number(req.session.user.id);
    const selectedUserId = Number.parseInt(req.query.with, 10);

    try {
        const [conversations] = await db.query(
            `
            SELECT
                other_user.id,
                other_user.name,
                MAX(messages.sent_at) AS last_message_time
            FROM messages
            INNER JOIN users AS other_user
                ON other_user.id =
                    CASE
                        WHEN messages.sender_id = ?
                        THEN messages.receiver_id
                        ELSE messages.sender_id
                    END
            WHERE messages.sender_id = ?
               OR messages.receiver_id = ?
            GROUP BY other_user.id, other_user.name
            ORDER BY last_message_time DESC
            `,
            [
                currentUserId,
                currentUserId,
                currentUserId
            ]
        );

        const [allUsers] = await db.query(
            `
            SELECT id, name
            FROM users
            WHERE id <> ?
            ORDER BY name ASC
            `,
            [currentUserId]
        );

        let partner = null;
        let thread = [];

        if (
            Number.isInteger(selectedUserId) &&
            selectedUserId > 0 &&
            selectedUserId !== currentUserId
        ) {
            const [partnerRows] = await db.query(
                `
                SELECT id, name
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [selectedUserId]
            );

            partner = partnerRows[0] || null;

            if (partner) {
                [thread] = await db.query(
                    `
                    SELECT
                        messages.message_id,
                        messages.sender_id,
                        messages.receiver_id,
                        messages.content,
                        messages.sent_at,
                        messages.is_read,
                        users.name AS sender_name
                    FROM messages
                    INNER JOIN users
                        ON users.id = messages.sender_id
                    WHERE
                        (
                            messages.sender_id = ?
                            AND messages.receiver_id = ?
                        )
                        OR
                        (
                            messages.sender_id = ?
                            AND messages.receiver_id = ?
                        )
                    ORDER BY messages.sent_at ASC
                    `,
                    [
                        currentUserId,
                        selectedUserId,
                        selectedUserId,
                        currentUserId
                    ]
                );

                await db.query(
                    `
                    UPDATE messages
                    SET is_read = 1
                    WHERE sender_id = ?
                      AND receiver_id = ?
                      AND is_read = 0
                    `,
                    [
                        selectedUserId,
                        currentUserId
                    ]
                );
            }
        }

        return res.render('message', {
            pageTitle: 'Messages',
            user: req.session.user,
            conversations,
            allUsers,
            partner,
            thread,
            errors: req.flash('error'),
            successMsgs: req.flash('success')
        });
    } catch (error) {
        console.error('Messages page error:', error);
        req.flash('error', 'Unable to load messages.');

        return res.redirect('/');
    }
});

app.post('/chat/send', checkAuthenticated, async (req, res) => {
    const senderId = Number(req.session.user.id);
    const receiverId = Number.parseInt(req.body.receiver_id, 10);
    const content = String(req.body.content || '').trim();

    if (
        !Number.isInteger(receiverId) ||
        receiverId <= 0 ||
        receiverId === senderId
    ) {
        req.flash('error', 'Please select a valid user.');

        return res.redirect('/messages');
    }

    if (!content) {
        req.flash('error', 'Message cannot be empty.');

        return res.redirect(`/messages?with=${receiverId}`);
    }

    if (content.length > 2000) {
        req.flash('error', 'Message is too long.');

        return res.redirect(`/messages?with=${receiverId}`);
    }

    try {
        const [receivers] = await db.query(
            `
            SELECT id
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
            [receiverId]
        );

        if (receivers.length === 0) {
            req.flash('error', 'The selected user does not exist.');

            return res.redirect('/messages');
        }

        await db.query(
            `
            INSERT INTO messages
            (
                sender_id,
                receiver_id,
                content
            )
            VALUES (?, ?, ?)
            `,
            [
                senderId,
                receiverId,
                content
            ]
        );

        return res.redirect(`/messages?with=${receiverId}`);
    } catch (error) {
        console.error('Send message error:', error);
        req.flash('error', 'Unable to send the message.');

        return res.redirect(`/messages?with=${receiverId}`);
    }
});

// ---------------------------------------------------------
// SCHEDULING
// ---------------------------------------------------------

// GET /schedule - show my upcoming sessions + booking form
app.get('/schedule', checkAuthenticated, async (req, res) => {
    const currentUserId = Number(req.session.user.id);

    try {
        const [sessions] = await db.query(
            `
            SELECT
                sessions.session_id,
                sessions.learner_id,
                sessions.teacher_id,
                sessions.skill_id,
                sessions.session_date,
                sessions.session_time,
                sessions.status,
                skills.skill_name,
                learner.name AS learner_name,
                teacher.name AS teacher_name
            FROM sessions
            INNER JOIN skills
                ON skills.id = sessions.skill_id
            INNER JOIN users AS learner
                ON learner.id = sessions.learner_id
            INNER JOIN users AS teacher
                ON teacher.id = sessions.teacher_id
            WHERE sessions.learner_id = ?
               OR sessions.teacher_id = ?
            ORDER BY
                sessions.session_date ASC,
                sessions.session_time ASC
            `,
            [
                currentUserId,
                currentUserId
            ]
        );

        const [availableSkills] = await db.query(
            `
            SELECT
                skills.id,
                skills.skill_name,
                skills.user_id AS teacher_id,
                users.name AS teacher_name
            FROM skills
            INNER JOIN users
                ON users.id = skills.user_id
            WHERE skills.user_id <> ?
              AND LOWER(skills.skill_type) = 'offer'
            ORDER BY skills.skill_name ASC
            `,
            [currentUserId]
        );

        return res.render('schedule', {
            pageTitle: 'Schedule',
            user: req.session.user,
            sessions,
            availableSkills,
            errors: req.flash('error'),
            successMsgs: req.flash('success')
        });
    } catch (error) {
        console.error('Schedule page error:', error);
        req.flash('error', 'Unable to load your schedule.');

        return res.redirect('/');
    }
});

app.post('/schedule', checkAuthenticated, async (req, res) => {
    const learnerId = Number(req.session.user.id);
    const skillId = Number.parseInt(req.body.skill_id, 10);
    const sessionDate = String(
        req.body.session_date || ''
    ).trim();
    const sessionTime = String(
        req.body.session_time || ''
    ).trim();

    if (
        !Number.isInteger(skillId) ||
        skillId <= 0 ||
        !sessionDate ||
        !sessionTime
    ) {
        req.flash('error', 'Please complete all session fields.');

        return res.redirect('/schedule');
    }

    try {
        const [skillRows] = await db.query(
            `
            SELECT id, user_id
            FROM skills
            WHERE id = ?
              AND LOWER(skill_type) = 'offer'
            LIMIT 1
            `,
            [skillId]
        );

        if (skillRows.length === 0) {
            req.flash('error', 'The selected skill is unavailable.');

            return res.redirect('/schedule');
        }

        const teacherId = Number(skillRows[0].user_id);

        if (teacherId === learnerId) {
            req.flash(
                'error',
                'You cannot book a session with yourself.'
            );

            return res.redirect('/schedule');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const selectedDate = new Date(
            `${sessionDate}T00:00:00`
        );

        if (
            Number.isNaN(selectedDate.getTime()) ||
            selectedDate < today
        ) {
            req.flash(
                'error',
                'Please choose today or a future date.'
            );

            return res.redirect('/schedule');
        }

        const [conflicts] = await db.query(
            `
            SELECT session_id
            FROM sessions
            WHERE session_date = ?
              AND session_time = ?
              AND status <> 'Cancelled'
              AND
              (
                  learner_id IN (?, ?)
                  OR teacher_id IN (?, ?)
              )
            LIMIT 1
            `,
            [
                sessionDate,
                sessionTime,
                learnerId,
                teacherId,
                learnerId,
                teacherId
            ]
        );

        if (conflicts.length > 0) {
            req.flash(
                'error',
                'You or the teacher already has a session at that time.'
            );

            return res.redirect('/schedule');
        }

        await db.query(
            `
            INSERT INTO sessions
            (
                learner_id,
                teacher_id,
                skill_id,
                session_date,
                session_time,
                status
            )
            VALUES (?, ?, ?, ?, ?, 'Pending')
            `,
            [
                learnerId,
                teacherId,
                skillId,
                sessionDate,
                sessionTime
            ]
        );

        req.flash(
            'success',
            'Session request created successfully.'
        );

        return res.redirect('/schedule');
    } catch (error) {
        console.error('Create session error:', error);
        req.flash('error', 'Unable to create the session.');

        return res.redirect('/schedule');
    }
});

app.post(
    '/schedule/cancel/:id',
    checkAuthenticated,
    async (req, res) => {
        const currentUserId = Number(req.session.user.id);
        const sessionId = Number.parseInt(req.params.id, 10);

        if (
            !Number.isInteger(sessionId) ||
            sessionId <= 0
        ) {
            req.flash('error', 'Invalid session.');

            return res.redirect('/schedule');
        }

        try {
            const [result] = await db.query(
                `
                UPDATE sessions
                SET status = 'Cancelled'
                WHERE session_id = ?
                  AND
                  (
                      learner_id = ?
                      OR teacher_id = ?
                  )
                `,
                [
                    sessionId,
                    currentUserId,
                    currentUserId
                ]
            );

            if (result.affectedRows === 0) {
                req.flash(
                    'error',
                    'Session not found or access denied.'
                );
            } else {
                req.flash(
                    'success',
                    'Session cancelled successfully.'
                );
            }

            return res.redirect('/schedule');
        } catch (error) {
            console.error('Cancel session error:', error);
            req.flash('error', 'Unable to cancel the session.');

            return res.redirect('/schedule');
        }
    }
);

// POST /schedule/:id/accept - only the teacher for that session can
// confirm a Pending request
app.post(
    '/schedule/:id/accept',
    checkAuthenticated,
    async (req, res) => {
        const currentUserId = Number(req.session.user.id);
        const sessionId = Number.parseInt(req.params.id, 10);

        if (!Number.isInteger(sessionId) || sessionId <= 0) {
            req.flash('error', 'Invalid session.');
            return res.redirect('/schedule');
        }

        try {
            const [result] = await db.query(
                `
                UPDATE sessions
                SET status = 'Confirmed'
                WHERE session_id = ?
                  AND teacher_id = ?
                  AND status = 'Pending'
                `,
                [sessionId, currentUserId]
            );

            if (result.affectedRows === 1) {
                req.flash('success', 'Session confirmed.');
            } else {
                req.flash('error', 'This session cannot be confirmed.');
            }

            return res.redirect('/schedule');
        } catch (error) {
            console.error('Accept session error:', error);
            req.flash('error', 'Unable to confirm the session.');
            return res.redirect('/schedule');
        }
    }
);

// POST /schedule/:id/reject - only the teacher for that session can
// decline a Pending request
app.post(
    '/schedule/:id/reject',
    checkAuthenticated,
    async (req, res) => {
        const currentUserId = Number(req.session.user.id);
        const sessionId = Number.parseInt(req.params.id, 10);

        if (!Number.isInteger(sessionId) || sessionId <= 0) {
            req.flash('error', 'Invalid session.');
            return res.redirect('/schedule');
        }

        try {
            const [result] = await db.query(
                `
                UPDATE sessions
                SET status = 'Rejected'
                WHERE session_id = ?
                  AND teacher_id = ?
                  AND status = 'Pending'
                `,
                [sessionId, currentUserId]
            );

            if (result.affectedRows === 1) {
                req.flash('success', 'Session declined.');
            } else {
                req.flash('error', 'This session cannot be declined.');
            }

            return res.redirect('/schedule');
        } catch (error) {
            console.error('Reject session error:', error);
            req.flash('error', 'Unable to decline the session.');
            return res.redirect('/schedule');
        }
    }
);

// POST /schedule/:id/complete - only the teacher can mark a Confirmed session as Completed, which triggers gamification rewards
app.post(
    '/schedule/:id/complete',
    checkAuthenticated,
    async (req, res) => {
        const currentUserId = Number(req.session.user.id);
        const sessionId = Number.parseInt(req.params.id, 10);

        // Validate that the session ID is a positive integer
        if (!Number.isInteger(sessionId) || sessionId <= 0) {
            req.flash('error', 'Invalid session.');
            return res.redirect('/schedule');
        }

        try {
            // Verify the session exists, belongs to the current teacher, and is 'Confirmed' (only Confirmed sessions can be completed)
            const [sessions] = await db.query(
                `
                SELECT learner_id, teacher_id
                FROM sessions
                WHERE session_id = ?
                  AND teacher_id = ?
                  AND status = 'Confirmed'
                LIMIT 1
                `,
                [sessionId, currentUserId]
            );

            // If no matching session found, reject the request
            if (sessions.length === 0) {
                req.flash('error', 'This session cannot be completed.');
                return res.redirect('/schedule');
            }

            // Extract both participant IDs for gamification rewards
            const learnerId = Number(sessions[0].learner_id);
            const teacherId = Number(sessions[0].teacher_id);

            // Update the session status to 'Completed'
            await db.query(
                `
                UPDATE sessions
                SET status = 'Completed'
                WHERE session_id = ?
                `,
                [sessionId]
            );

            // GAMIFICATION: Award 100 XP to both learner and teacher.
            // awardXP() adds points and triggers checkLevelUp() which promotes the user if they have enough XP for the next level.
            awardXP(learnerId, 100);
            awardXP(teacherId, 100);

            // GAMIFICATION: Check and award badges for both users.
            // checkAndAwardBadges() counts completed sessions and grants badges like 'First Trade', 'Skill Master', 'Community Hero', and 'Top Teacher' based on the user's exchange history.
            checkAndAwardBadges(learnerId);
            checkAndAwardBadges(teacherId);

            req.flash('success', 'Session marked as completed.');
            return res.redirect('/schedule');
        } catch (error) {
            console.error('Complete session error:', error);
            req.flash('error', 'Unable to complete the session.');
            return res.redirect('/schedule');
        }
    }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));