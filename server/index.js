const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { pool, initDb } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. Index / health check
app.get("/", async (req, res) => {
  let dbConnected = false;
  try {
    await pool.query("SELECT 1");
    dbConnected = true;
  } catch (err) {
    dbConnected = false;
  }

  res.status(200).json({
    statusCode: 200,
    message: "Backend is running",
    dbConnected,
    db: dbConnected ? "connected" : "disconnected",
  });
});

// 2. Signup (plain password, no bcrypt, no JWT)
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      statusCode: 400,
      message: "Email and password are required",
    });
  }

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        statusCode: 409,
        message: "User already exists",
      });
    }

    const result = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
      [name || null, email, password]
    );

    return res.status(201).json({
      statusCode: 201,
      message: "Signup successful",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    return res.status(500).json({
      statusCode: 500,
      message: "Server error during signup",
    });
  }
});

// 3. Login (plain comparison, no bcrypt, no JWT)
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      statusCode: 400,
      message: "Email and password are required",
    });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found",
      });
    }

    const user = result.rows[0];

    if (user.password !== password) {
      return res.status(401).json({
        statusCode: 401,
        message: "Invalid credentials",
      });
    }

    const { password: _, ...safeUser } = user;

    return res.status(200).json({
      statusCode: 200,
      message: "Login successful",
      user: safeUser,
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({
      statusCode: 500,
      message: "Server error during login",
    });
  }
});

async function start() {
  try {
    await initDb();
  } catch (err) {
    console.error("DB init failed:", err.message);
  }
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
