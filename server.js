const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data.json");
const sessions = new Map();
const COURSES = ["CSE", "CSE - AI", "CSE - AI&ML", "CSE - Data Science", "CSE - Cyber Security", "CSE - IoT", "ECE", "EEE", "MECH", "CIVIL", "IT", "AI&DS"];
const SUBJECTS = {
  "1st Year": ["Maths-I", "Physics", "C Programming", "BEE", "EGD", "Maths-II", "Chemistry", "DS (C)", "BEC", "English Lab"],
  "2nd Year": ["Discrete Maths", "DLD", "Java", "OS", "CO", "DBMS", "CN", "DAA", "FLAT", "Python"],
  "3rd Year": ["AI", "ML", "SE", "WT", "CD", "Cloud", "Cyber Security", "Data Science", "IoT", "Big Data"],
  "4th Year": ["Deep Learning", "Blockchain", "DevOps", "Project Phase-I", "Project Phase-II"]
};
const FACULTY_POSITIONS = ["Assistant Professor", "Associate Professor", "Professor", "HOD - CSE", "HOD - ECE", "Lab Assistant", "Lab Technician", "Dean", "Principal", "Placement Officer", "Class In-charge", "Project Coordinator", "WT Lab In-charge"];

const seed = {
  users: [{ id: 3, name: "Campus Admin", email: "admin@scsp.edu", password: "admin123", role: "admin" }],
  attendance: [],
  fees: [],
  notices: [],
  books: [],
  issuedBooks: [],
  complaints: [],
  timetable: []
};

function loadData() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
let db = loadData();
function save() { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); }
function json(res, status, payload) { res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }); res.end(JSON.stringify(payload)); }
function body(req) {
  return new Promise((resolve, reject) => {
    let raw = ""; req.on("data", chunk => raw += chunk); req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
  });
}
function auth(req) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  return sessions.get(token);
}
function id() { return crypto.randomUUID(); }
function publicUser(user) { const { password, ...safe } = user; return safe; }
function averageAttendance(studentId) {
  const rows = db.attendance.filter(x => x.studentId === studentId);
  const attended = rows.reduce((n, x) => n + x.attended, 0), total = rows.reduce((n, x) => n + x.total, 0);
  return total ? Math.round(attended / total * 100) : 0;
}

async function api(req, res, url) {
  if (req.method === "OPTIONS") return json(res, 204, {});
  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const input = await body(req);
    const identifier = String(input.identifier || "").trim().toUpperCase();
    const user = db.users.find(u => (u.rollNo === identifier || u.facultyId === identifier || u.email === input.identifier.trim().toLowerCase()) && u.password === input.password);
    if (!user) return json(res, 401, { message: "Invalid credentials. Please check your ID and password." });
    const token = id(); sessions.set(token, user.id);
    return json(res, 200, { token, user: publicUser(user) });
  }
  if (req.method === "POST" && ["/api/auth/register/student", "/api/auth/register/faculty"].includes(url.pathname)) return json(res, 403, { message: "User accounts can only be created by an administrator." });
  if (req.method === "POST" && url.pathname === "/api/auth/register/student") {
    const input = await body(req);
    const rollNo = String(input.rollNo || "").trim().toUpperCase();
    if (!/^2[A-Z0-9]73A0[A-Z0-9]{4}$/.test(rollNo)) return json(res, 400, { message: "Roll number must match 2X73A0XXXX (for example, 2A73A00001)." });
    if (!input.name || !input.password) return json(res, 400, { message: "Name and password are required." });
    if (!COURSES.includes(input.course)) return json(res, 400, { message: "Please select a valid course." });
    if (db.users.some(u => u.rollNo === rollNo)) return json(res, 409, { message: "That roll number is already registered." });
    const student = { id: Date.now(), name: String(input.name).trim(), rollNo, email: String(input.email || `${rollNo.toLowerCase()}@scsp.edu`).trim().toLowerCase(), password: String(input.password), role: "student", course: String(input.course || "Computer Science").trim(), year: "1st Year", section: "A" };
    db.users.push(student); save();
    const token = id(); sessions.set(token, student.id);
    return json(res, 201, { token, user: publicUser(student) });
  }
  if (req.method === "POST" && url.pathname === "/api/admin/users") {
    const input = await body(req);
    if (!["admin"].includes(auth(req) && db.users.find(x => x.id === auth(req)).role)) return json(res, 403, { message: "Only admins can add college users." });
    const role = input.role;
    if (role === "student") {
      const rollNo = String(input.rollNo || "").trim().toUpperCase();
      if (!/^2[A-Z0-9]73A0[A-Z0-9]{4}$/.test(rollNo)) return json(res, 400, { message: "Roll number must match 2X73A0XXXX." });
      if (!input.name || !COURSES.includes(input.course) || !["1st Year", "2nd Year", "3rd Year", "4th Year"].includes(input.year) || !input.section) return json(res, 400, { message: "Name, course, year and class are required." });
      if (db.users.some(x => x.rollNo === rollNo)) return json(res, 409, { message: "That roll number already exists." });
      const student = { id: Date.now(), name: String(input.name).trim(), rollNo, email: `${rollNo.toLowerCase()}@scsp.edu`, password: rollNo, role, course: input.course, year: input.year, section: String(input.section).trim() };
      db.users.push(student); save(); return json(res, 201, publicUser(student));
    }
    if (role === "faculty") {
      const facultyId = String(input.facultyId || "").trim().toUpperCase();
      if (!/^2473F[A-Z0-9]{4}$/.test(facultyId) || !input.name || !input.email) return json(res, 400, { message: "Name, valid Faculty ID and email are required." });
      if (db.users.some(x => x.facultyId === facultyId || x.email === input.email.toLowerCase())) return json(res, 409, { message: "That Faculty ID or email already exists." });
      const position = String(input.position || "Assistant Professor").trim();
      if (!FACULTY_POSITIONS.includes(position)) return json(res, 400, { message: "Please select a valid faculty position." });
      const faculty = { id: Date.now(), name: String(input.name).trim(), facultyId, email: input.email.toLowerCase(), password: String(input.password || facultyId), role, department: String(input.department || "Computer Science"), position, assignments: [] };
      db.users.push(faculty); save(); return json(res, 201, publicUser(faculty));
    }
    return json(res, 400, { message: "Choose student or faculty." });
  }
  if (req.method === "POST" && url.pathname === "/api/auth/register/faculty") {
    const input = await body(req);
    const facultyId = String(input.facultyId || "").trim().toUpperCase();
    if (!/^2473F[A-Z0-9]{4}$/.test(facultyId)) return json(res, 400, { message: "Faculty ID must match 2473FXXXX (for example, 2473F0001)." });
    if (!input.name || !input.email || !input.password) return json(res, 400, { message: "Name, email and password are required." });
    if (db.users.some(u => u.facultyId === facultyId || u.email === String(input.email).trim().toLowerCase())) return json(res, 409, { message: "That faculty ID or email is already registered." });
    const faculty = { id: Date.now(), name: String(input.name).trim(), facultyId, email: String(input.email).trim().toLowerCase(), password: String(input.password), role: "faculty", department: String(input.department || "Computer Science").trim() };
    db.users.push(faculty); save();
    const token = id(); sessions.set(token, faculty.id);
    return json(res, 201, { token, user: publicUser(faculty) });
  }
  const userId = auth(req);
  if (!userId) return json(res, 401, { message: "Your session has expired. Please sign in again." });
  const user = db.users.find(u => u.id === userId);
  const studentId = user.role === "student" ? user.id : Number(url.searchParams.get("studentId")) || 1;
  if (req.method === "GET" && url.pathname === "/api/me") return json(res, 200, { user: publicUser(user) });
  if (req.method === "GET" && url.pathname === "/api/dashboard") {
    const attendance = averageAttendance(studentId);
    return json(res, 200, { attendance, attendanceRows: db.attendance.filter(x => x.studentId === studentId), fees: db.fees.filter(x => x.studentId === studentId), notices: db.notices.slice(0, 3), issuedBooks: db.issuedBooks.filter(x => x.studentId === studentId && !x.returned), complaints: db.complaints.filter(x => x.studentId === studentId), timetable: db.timetable });
  }
  if (req.method === "GET" && url.pathname === "/api/notices") return json(res, 200, db.notices);
  if (req.method === "GET" && url.pathname === "/api/library") return json(res, 200, { books: db.books, issuedBooks: db.issuedBooks.filter(x => x.studentId === studentId) });
  if (req.method === "GET" && url.pathname === "/api/complaints") return json(res, 200, user.role === "student" ? db.complaints.filter(x => x.studentId === user.id) : db.complaints);
  if (req.method === "GET" && url.pathname === "/api/admin/overview") {
    return json(res, 200, { students: db.users.filter(x => x.role === "student"), faculty: db.users.filter(x => x.role === "faculty"), complaints: db.complaints, fees: db.fees, books: db.books, attendance: db.attendance });
  }
  if (req.method === "PATCH" && url.pathname.startsWith("/api/faculty/")) {
    if (user.role !== "admin") return json(res, 403, { message: "Only admins can assign faculty." });
    const faculty = db.users.find(x => x.id === Number(url.pathname.split("/").pop()) && x.role === "faculty");
    if (!faculty) return json(res, 404, { message: "Faculty member not found." });
    const input = await body(req);
    faculty.position = String(input.position || "").trim();
    faculty.assignments = Array.isArray(input.assignments) ? input.assignments : [];
    if (!FACULTY_POSITIONS.includes(faculty.position)) return json(res, 400, { message: "Please select a valid faculty position." });
    if (faculty.assignments.some(x => !SUBJECTS[x.year] || !SUBJECTS[x.year].includes(x.subject))) return json(res, 400, { message: "The selected subject is not available for that academic year." });
    save(); return json(res, 200, publicUser(faculty));
  }
  if (req.method === "PATCH" && url.pathname.startsWith("/api/fees/")) {
    if (user.role !== "admin") return json(res, 403, { message: "Only admins can update fee status." });
    const fee = db.fees.find(x => x.id === Number(url.pathname.split("/").pop()));
    if (!fee) return json(res, 404, { message: "Fee record not found." });
    const input = await body(req); fee.status = input.status === "paid" ? "paid" : "pending"; fee.paidOn = fee.status === "paid" ? new Date().toISOString().slice(0, 10) : undefined;
    save(); return json(res, 200, fee);
  }
  if (req.method === "POST" && url.pathname === "/api/complaints") {
    const input = await body(req); const item = { id: Date.now(), studentId: user.id, title: input.title, category: input.category, description: input.description, status: "Open", createdAt: new Date().toISOString().slice(0, 10) };
    db.complaints.unshift(item); save(); return json(res, 201, item);
  }
  if (req.method === "PATCH" && url.pathname.startsWith("/api/complaints/")) {
    if (!["admin", "faculty"].includes(user.role)) return json(res, 403, { message: "Only staff can update complaints." });
    const item = db.complaints.find(x => x.id === Number(url.pathname.split("/").pop())); if (!item) return json(res, 404, { message: "Complaint not found." });
    const input = await body(req); item.status = input.status || item.status; save(); return json(res, 200, item);
  }
  if (req.method === "POST" && url.pathname === "/api/notices") {
    if (user.role === "student") return json(res, 403, { message: "Only staff can publish notices." });
    const input = await body(req); const item = { id: Date.now(), title: input.title, body: input.body, audience: input.audience || "All students", tag: input.tag || "General", date: new Date().toISOString().slice(0, 10) };
    db.notices.unshift(item); save(); return json(res, 201, item);
  }
  if (req.method === "POST" && url.pathname === "/api/attendance") {
    if (user.role === "student") return json(res, 403, { message: "Only faculty can mark attendance." });
    const input = await body(req);
    if (user.role === "faculty" && !(user.assignments || []).some(x => x.subject === input.subject && x.course === input.course && x.year === input.year)) return json(res, 403, { message: "This subject is not assigned to your faculty account." });
    const row = db.attendance.find(x => x.studentId === Number(input.studentId) && x.subject === input.subject);
    if (row) { row.total += 1; if (input.present) row.attended += 1; } else db.attendance.push({ id: Date.now(), studentId: Number(input.studentId), subject: input.subject, code: input.subject.slice(0, 5).toUpperCase(), attended: input.present ? 1 : 0, total: 1 });
    save(); return json(res, 200, { message: "Attendance recorded successfully." });
  }
  return json(res, 404, { message: "API endpoint not found." });
}

const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) { try { await api(req, res, url); } catch (e) { json(res, 400, { message: "Invalid request." }); } return; }
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const file = path.join(ROOT, "public", requested);
  if (!file.startsWith(path.join(ROOT, "public"))) return json(res, 403, { message: "Forbidden." });
  fs.readFile(file, (err, data) => { if (err) return json(res, 404, { message: "Page not found." }); res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" }); res.end(data); });
});
server.listen(PORT, () => console.log(`SCSP portal running at http://localhost:${PORT}`));
