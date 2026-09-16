# Smart Student Campus Portal

A full-stack campus portal for students, faculty and administrators. The project uses a dependency-free Node.js HTTP API and a responsive browser frontend, so it can be started without a build step.

## Run locally

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000).

You can also open the HTML files directly by double-clicking them:

- `public/student-login.html`
- `public/faculty-login.html`
- `public/admin-login.html`
- `public/index.html`
- `public/fee-attendance.html`

When opened directly, the pages use browser local storage and demo data, so login, student registration and faculty registration work without a command. For shared live data across users, use the server URL.

The clean dataset starts with only the admin account. Admin-created student and faculty accounts are stored in `data.json`; when the server is available, directly opened login pages try the shared API first, so those accounts work from the individual HTML files too.

Dedicated login pages are also available:

- [Student login](http://localhost:3000/student-login.html)
- [Faculty login](http://localhost:3000/faculty-login.html)
- [Admin login](http://localhost:3000/admin-login.html)

## Demo accounts

| Role | Login | Password |
| --- | --- | --- |
| Student | `2A73A00001` | `student123` |
| Faculty | `2473F0001` or `meera@scsp.edu` | `faculty123` |
| Admin | `admin@scsp.edu` | `admin123` |

## Included workflows

- Student dashboard with attendance, fee due, notices and library summaries
- Student registration with roll numbers matching `2X73A0XXXX` (where each `X` is an uppercase letter or digit)
- Student registration course options: CSE, CSE - AI, CSE - AI&ML, CSE - Data Science, CSE - Cyber Security, CSE - IoT, ECE, EEE, MECH, CIVIL, IT and AI&DS
- Faculty registration with IDs matching `2473FXXXX` (where each `X` is an uppercase letter or digit)
- Admin faculty assignments use the configured year-wise subject list and approved faculty positions
- Only admins can add students and faculty. A new student's initial password is their roll number.
- Subject-wise attendance with the 75% warning threshold
- Digital ID card and QR verification surfaces
- Results, weekly timetable, fee ledger and receipt action
- Library catalogue search and issued-book view
- Complaint ticket creation and status tracking
- Faculty attendance marking and notice publishing
- Admin overview, fee management, library catalogue, complaints and reports
- JSON persistence in `data.json` and bearer-token sessions

The API lives in `server.js`; the browser application is in `public/app.js` and `public/styles.css`.
