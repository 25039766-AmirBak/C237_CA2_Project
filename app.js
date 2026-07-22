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
const TEMP_TEST_USER_ID = 1;

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

/*
Normalise matching text so comparisons are not affected by:
- Uppercase/lowercase
- Extra spaces
- Symbols such as /, -, &, or .
*/
const normaliseMatchText = (value) => {
    return String(value || '')
        .toLowerCase()
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
1. One normalised skill name contains the other, or
2. Every keyword from the shorter skill appears in the longer skill.
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
    if (
        firstName.includes(secondName) ||
        secondName.includes(firstName)
    ) {
        return true;
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
    return shorterKeywords.every((keyword) => {
        return longerKeywords.includes(keyword);
    });
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