
const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Generate access token
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.user_id,
      role: user.role_name,
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    }
  );
};

// Generate secure refresh token
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

// Hash refresh token before storing it
const hashRefreshToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// Save refresh token in PostgreSQL
const saveRefreshToken = async (userId, refreshToken) => {
  const tokenHash = hashRefreshToken(refreshToken);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 day'))`,
    [userId, tokenHash, Number(process.env.JWT_REFRESH_DAYS || 7)]
  );
};

// Safe user information
const getSafeUser = (user) => ({
  user_id: user.user_id,
  full_name: user.full_name,
  email: user.email,
  phone_number: user.phone_number,
  role: user.role_name,
  account_status: user.account_status,
});

// STUDENT REGISTRATION
const register = async (req, res) => {
  try {
    const { full_name, email, password, phone_number } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    // Find Student role; users cannot choose their own role
    const roleResult = await pool.query(
      "SELECT role_id FROM roles WHERE role_name = $1",
      ["Student"]
    );

    if (roleResult.rows.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Student role is not configured in the database.",
      });
    }

    const existingUser = await pool.query(
      "SELECT user_id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users
       (role_id, full_name, email, password_hash, phone_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, full_name, email, phone_number, account_status`,
      [
        roleResult.rows[0].role_id,
        full_name.trim(),
        normalizedEmail,
        passwordHash,
        phone_number || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Student account registered successfully.",
      user: result.rows[0],
    });

  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed.",
    });
  }
};

// USER LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const result = await pool.query(
      `SELECT u.*, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.email = $1`,
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.account_status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active. Contact an administrator.",
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    await saveRefreshToken(user.user_id, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: getSafeUser(user),
      accessToken,
      refreshToken,
    });

  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed.",
    });
  }
};

// REFRESH ACCESS TOKEN
const refresh = async (req, res) => {
  const client = await pool.connect();

  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== "string") {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
    }

    const tokenHash = hashRefreshToken(refreshToken);

    await client.query("BEGIN");

    const result = await client.query(
      `SELECT rt.refresh_token_id, rt.user_id,
              u.account_status, u.full_name, u.email,
              u.phone_number, r.role_name
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.user_id
       JOIN roles r ON u.role_id = r.role_id
       WHERE rt.token_hash = $1
         AND rt.revoked_at IS NULL
         AND rt.expires_at > NOW()
       FOR UPDATE OF rt`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token.",
      });
    }

    const user = result.rows[0];

    if (user.account_status !== "active") {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message: "Account is not active.",
      });
    }

    // Revoke old token
    await client.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE refresh_token_id = $1`,
      [user.refresh_token_id]
    );

    // Create replacement token
    const newRefreshToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(newRefreshToken);
    const refreshDays = Number(process.env.JWT_REFRESH_DAYS || 7);

    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 day'))`,
      [user.user_id, newTokenHash, refreshDays]
    );

    await client.query("COMMIT");

    const accessToken = generateAccessToken(user);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
      accessToken,
      refreshToken: newRefreshToken,
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Refresh token error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not refresh token.",
    });

  } finally {
    client.release();
  }
};

// USER LOGOUT
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== "string") {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
    }

    const tokenHash = hashRefreshToken(refreshToken);

    const result = await pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE token_hash = $1 AND revoked_at IS NULL
       RETURNING refresh_token_id`,
      [tokenHash]
    );

    return res.status(200).json({
      success: true,
      message: result.rowCount > 0
        ? "Logout successful."
        : "Token was already invalidated.",
    });

  } catch (error) {
    console.error("Logout error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Logout failed.",
    });
  }
};

// GET AUTHENTICATED USER PROFILE
const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.full_name, u.email,
              u.phone_number, u.account_status,
              u.profile_image_url, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user: getSafeUser({
        ...result.rows[0],
        role_name: result.rows[0].role_name,
      }),
      profile_image_url: result.rows[0].profile_image_url,
    });

  } catch (error) {
    console.error("Profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve profile.",
    });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getProfile,
};
