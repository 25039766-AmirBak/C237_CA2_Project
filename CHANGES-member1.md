# Member 1 — User Registration & Profiles (updated implementation)

## What changed

**app.js** — only the "Member 1: USER REGISTRATION & PROFILES" section was
replaced (plus two require lines for `fs` and `path` at the top). Every other
member's code is untouched. The section now contains:

- `POST /register` — bcrypt password hashing, duplicate-email check,
  validation with form repopulation after errors, optional profile picture
  upload (2MB max, images only)
- `POST /login` — bcrypt compare with legacy plain-text upgrade, session
  regeneration, role-based redirect (admin → /admin), and brute-force
  protection: 5 wrong passwords lock the account for 5 minutes (tracked in
  memory — no database changes)
- `POST /logout` (GET kept for old links)
- `GET /profile` — profile with picture, contact, role, level, XP,
  member-since, last-login, and the user's skills with edit/delete actions
- `GET /profile/edit` + `POST /profile/edit` — edit name, contact, bio,
  profile picture
- `GET /users/:id` — public member profiles (login required; email and
  contact are never shown to other members; `?preview=1` shows your own)

## Database: ZERO changes

The shared Azure database schema is completely untouched:

- Profile pictures are stored as files (`public/images/profile-<id>.<ext>`),
  not a database column.
- Login-attempt lockout is tracked in server memory.
- Last-login times live in `data/last-logins.json` (auto-created).
- All queries use only columns that already exist:
  `users(id, name, email, password, contact, bio, role, points, level, created_at)`

## Files touched

| File | Change |
|---|---|
| `app.js` | Member 1 section replaced; `fs`/`path` requires added |
| `views/register.ejs` | replaced (adds strength meter, show/hide password, picture upload) |
| `views/login.ejs` | replaced (same layout, adds flash alerts) |
| `views/profile.ejs` | replaced (adds picture, member-since, last-login, Public View button) |
| `views/edit-profile.ejs` | new |
| `views/user-profile.ejs` | new (public profiles) |
| `public/css/profile.css` | strength-meter styles appended at the end |
| `CHANGES-member1.md` | this file |

Everything else — including `views/partials/navbar.ejs`, all other views,
all other CSS, and every other route in app.js — is exactly as it was.
