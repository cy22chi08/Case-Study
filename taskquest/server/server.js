const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db");
const bcrypt = require("bcrypt");

const app = express();

app.use(cors());
app.use(bodyParser.json());
const path = require("path");
app.use(express.static(path.join(__dirname, "../public")));


/* =========================
   TEST ROUTE
========================= */
app.get("/", (req, res) => {
    res.send("TaskQuest Server Running 🚀");
});

/* =========================
   REGISTER API
========================= */
app.post("/register", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send("Username and password required");
    }

    db.query(
        "SELECT * FROM users WHERE username = ?",
        [username],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Database error");
            }

            if (result.length > 0) {
                return res.status(400).send("User already exists");
            }

            const hashedPassword = bcrypt.hashSync(password, 10);

            db.query(
                "INSERT INTO users (username, password, xp, level) VALUES (?, ?, 0, 1)",
                [username, hashedPassword],
                (err) => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send("Error creating user");
                    }

                    res.send("User registered successfully");
                }
            );
        }
    );
});

/* =========================
   LOGIN API (PROFILE READY)
========================= */
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Missing credentials" });
    }

    db.query(
        "SELECT * FROM users WHERE username = ?",
        [username],
        (err, result) => {
        console.log("LOGIN RESULT:", result);

            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Database error" });
            }

            if (result.length === 0) {
                return res.status(400).json({ message: "User not found" });
            }

            const user = result[0];

            const isMatch = bcrypt.compareSync(password, user.password);

            if (!isMatch) {
                return res.status(400).json({ message: "Incorrect password" });
            }

            const profileComplete =
                !!user.name && !!user.class && !!user.avatar;

            res.json({
                id: user.id,
                username: user.username,
                xp: user.xp,
                level: user.level,
                name: user.name,
                class: user.class,
                avatar: user.avatar,
                profileComplete
            });
        }
    );
});
/* =========================
   GET USER PROFILE
========================= */
app.get("/user/:id", (req, res) => {
    db.query(
        "SELECT id, username, xp, level, name, class, gender, avatar FROM users WHERE id = ?",
        [req.params.id],
        (err, result) => {
            if (err) return res.status(500).send("Error fetching user");

            res.json(result[0] || null);
        }
    );
});

/* =========================
   PROFILE UPDATE (SINGLE SOURCE OF TRUTH)
========================= */
app.post("/user/update-profile", (req, res) => {
    const { id, name, class: userClass, gender, avatar } = req.body;

    if (!id) {
        return res.status(400).send("Missing user id");
    }

    db.query(
        "UPDATE users SET name=?, class=?, gender=?, avatar=? WHERE id=?",
        [name, userClass, gender, avatar, id],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error updating profile");
            }

            res.send("Profile updated");
        }
    );
});

/* =========================
   CREATE TASK
========================= */
app.post("/tasks", (req, res) => {
    const {
        user_id,
        title,
        type,
        notes,
        checklist,
        difficulty,
        dueDate,
        repeatType,
        habitType,
        tag,
        xp
    } = req.body;

    if (!user_id || !title) {
        return res.status(400).send("Missing task data");
    }

    db.query(
        `INSERT INTO tasks 
        (user_id, title, type, notes, checklist, difficulty, dueDate, repeatType, habitType, tag, xp, completed) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,

        [
            user_id,
            title,
            type,
            notes || null,
            checklist && checklist !== "[]" ? checklist : null,
            difficulty || "easy",
            dueDate || null,
            repeatType || null,
            habitType || null,
            tag || null,
            xp ?? 0
        ],

        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send("Error adding task");
            }

            res.send("Task added successfully");
        }
    );
});

/* =========================
   GET TASKS
========================= */
app.get("/tasks/:user_id", (req, res) => {
    db.query(
        "SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC",
        [req.params.user_id],
        (err, results) => {
            if (err) return res.status(500).send("Error fetching tasks");

            res.json(results);
        }
    );
});

/* =========================
   BATCH COMPLETE SYSTEM
========================= */
app.post("/tasks/complete-batch", (req, res) => {
    let { user_id, taskIds } = req.body;

    // 🔥 DEBUG 1: incoming request
    console.log("\n===== COMPLETE BATCH REQUEST =====");
    console.log("USER ID:", user_id);
    console.log("RAW TASK IDS:", taskIds);
    console.log("TYPE OF taskIds:", typeof taskIds);

    if (!user_id || !taskIds || taskIds.length === 0) {
        console.log("❌ Missing data detected");
        return res.status(400).send("Missing data");
    }

    taskIds = taskIds.map(id => parseInt(id));

    console.log("PARSED TASK IDS:", taskIds);

    const now = new Date();

    db.query(
        "UPDATE tasks SET completed = 1, completed_at = ? WHERE id IN (?)",
        [now, taskIds],
        (err, result) => {

            // 🔥 DEBUG 2: DB result
            console.log("\n===== DB UPDATE RESULT =====");

            if (err) {
                console.log("❌ SQL ERROR:", err);
                return res.status(500).send("Error completing tasks");
            }

            console.log("AFFECTED ROWS:", result.affectedRows);

            const completedCount = result.affectedRows;
            const xpGain = completedCount * 10;

            console.log("COMPLETED COUNT:", completedCount);
            console.log("XP GAIN:", xpGain);

            if (completedCount === 0) {
                console.log("⚠️ No tasks were updated (maybe already completed or wrong IDs)");
                return res.status(400).send("No tasks completed");
            }

            // ADD XP
            db.query(
                "UPDATE users SET xp = xp + ? WHERE id = ?",
                [xpGain, user_id],
                (err) => {
                    if (err) {
                        console.log("❌ XP UPDATE ERROR:", err);
                    } else {
                        console.log("✅ XP updated successfully");
                    }
                }
            );

            // LEVEL SYSTEM
            db.query(
                "SELECT xp, level FROM users WHERE id = ?",
                [user_id],
                (err, result) => {

                    console.log("\n===== LEVEL CHECK =====");

                    if (err || result.length === 0) {
                        console.log("❌ Level fetch error:", err);
                        return;
                    }

                    let xp = result[0].xp;
                    let level = result[0].level;

                    console.log("CURRENT XP:", xp);
                    console.log("CURRENT LEVEL:", level);

                    while (xp >= 100) {
                        xp -= 100;
                        level++;
                    }

                    console.log("NEW XP:", xp);
                    console.log("NEW LEVEL:", level);

                    db.query(
                        "UPDATE users SET xp = ?, level = ? WHERE id = ?",
                        [xp, level, user_id],
                        (err) => {
                            if (err) {
                                console.log("❌ LEVEL UPDATE ERROR:", err);
                            } else {
                                console.log("✅ LEVEL UPDATED");
                            }
                        }
                    );
                }
            );

            // FINAL RESPONSE
            console.log("📤 RESPONSE SENT");
            res.json({
                completed: completedCount,
                xp: xpGain
            });
        }
    );
});

/* =========================
   HISTORY SYSTEM
========================= */
app.get("/tasks/history/:user_id", (req, res) => {
    db.query(
        "SELECT * FROM tasks WHERE user_id = ? AND completed = 1 ORDER BY completed_at DESC",
        [req.params.user_id],
        (err, results) => {
            if (err) return res.status(500).send("Error fetching history");

            res.json(results);
        }
    );
});

/* =========================
   START SERVER
========================= */
app.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
});