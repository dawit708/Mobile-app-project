
const pool = require("../config/database");
const bcrypt = require("bcryptjs");

// Allowed account statuses
const ALLOWED_STATUSES = ["active", "inactive", "suspended"];

// Registered users can have these roles.
// Guest access is public and does not require a permanent account.
const ALLOWED_ROLES = ["Student", "Staff", "Admin"];

// Validate user ID (this implementation assumes user_id is an integer)
function validateUserId(id) {
  return Number.isInteger(Number(id)) && Number(id) > 0;
}

// 1. CREATE STAFF ACCOUNT
const createStaff = async (req, res) => {
  try {
    const { full_name, email, password, phone_number } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email and password are required.",
      });
    }

    if (typeof full_name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid input types.",
      });
    }

    const normalizedName = full_name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 2 || normalizedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Full name must be between 2 and 100 characters.",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 72 characters.",
      });
    }

    if (
      phone_number !== undefined &&
      phone_number !== null &&
      typeof phone_number !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be a string.",
      });
    }

    // Check whether email already exists
    const existingUser = await pool.query(
      "SELECT user_id FROM users WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email address already exists.",
      });
    }

    // Get Staff role
    const roleResult = await pool.query(
      "SELECT role_id FROM roles WHERE role_name = $1",
      ["Staff"]
    );

    if (roleResult.rows.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Staff role is not configured in the database.",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert Staff account
    const result = await pool.query(
      `INSERT INTO users
       (role_id, full_name, email, password_hash, phone_number, account_status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING user_id, full_name, email, phone_number,
                 account_status, created_at`,
      [
        roleResult.rows[0].role_id,
        normalizedName,
        normalizedEmail,
        passwordHash,
        phone_number ? phone_number.trim() : null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Staff account created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create Staff error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email address already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create Staff account.",
    });
  }
};

// 2. GET ALL USERS
const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );
    const offset = (page - 1) * limit;

    const { search, role, status } = req.query;

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account status filter.",
      });
    }

    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search.trim()}%`);
      conditions.push(
        `(u.full_name ILIKE $${values.length}
          OR u.email ILIKE $${values.length})`
      );
    }

    if (role) {
      values.push(role);
      conditions.push(`r.role_name = $${values.length}`);
    }

    if (status) {
      values.push(status);
      conditions.push(`u.account_status = $${values.length}`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       ${whereClause}`,
      values
    );

    const total = countResult.rows[0].total;

    const result = await pool.query(
      `SELECT
         u.user_id,
         u.full_name,
         u.email,
         u.phone_number,
         u.account_status,
         r.role_name,
         u.created_at,
         u.updated_at
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully.",
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all users error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve users.",
    });
  }
};

// 3. GET USER BY ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateUserId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const result = await pool.query(
      `SELECT
         u.user_id,
         u.full_name,
         u.email,
         u.phone_number,
         u.account_status,
         r.role_name,
         u.created_at,
         u.updated_at
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1`,
      [Number(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User details retrieved successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get user by ID error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user details.",
    });
  }
};

// 4. UPDATE USER INFORMATION
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone_number } = req.body;

    if (!validateUserId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (
      full_name === undefined &&
      email === undefined &&
      phone_number === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update.",
      });
    }

    const fields = [];
    const values = [];

    if (full_name !== undefined) {
      if (
        typeof full_name !== "string" ||
        full_name.trim().length < 2 ||
        full_name.trim().length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Full name must be between 2 and 100 characters.",
        });
      }

      values.push(full_name.trim());
      fields.push(`full_name = $${values.length}`);
    }

    if (email !== undefined) {
      if (typeof email !== "string") {
        return res.status(400).json({
          success: false,
          message: "Email must be a string.",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address.",
        });
      }

      values.push(normalizedEmail);
      fields.push(`email = $${values.length}`);
    }

    if (phone_number !== undefined) {
      if (
        phone_number !== null &&
        typeof phone_number !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "Phone number must be a string or null.",
        });
      }

      values.push(phone_number === null ? null : phone_number.trim());
      fields.push(`phone_number = $${values.length}`);
    }

    values.push(Number(id));

    const result = await pool.query(
      `UPDATE users
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE user_id = $${values.length}
       RETURNING user_id, full_name, email, phone_number,
                 account_status, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User information updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update user error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email address already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update user information.",
    });
  }
};

// 5. CHANGE ACCOUNT STATUS
const updateUserStatus = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { account_status } = req.body;

    if (!validateUserId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (!ALLOWED_STATUSES.includes(account_status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active, inactive or suspended.",
      });
    }

    if (Number(id) === Number(req.user.userId) &&
        account_status !== "active") {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate or suspend your own account.",
      });
    }

    await client.query("BEGIN");

    const targetResult = await client.query(
      `SELECT u.user_id, u.account_status, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1
       FOR UPDATE OF u`,
      [Number(id)]
    );

    if (targetResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const target = targetResult.rows[0];

    // Prevent removal of the last active Admin
    if (
      target.role_name === "Admin" &&
      target.account_status === "active" &&
      account_status !== "active"
    ) {
      await client.query(
        `SELECT u.user_id
         FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE r.role_name = 'Admin'
           AND u.account_status = 'active'
         FOR UPDATE OF u`
      );

      const adminCount = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE r.role_name = 'Admin'
           AND u.account_status = 'active'`
      );

      if (adminCount.rows[0].total <= 1) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Cannot deactivate the last active Admin.",
        });
      }
    }

    const result = await client.query(
      `UPDATE users
       SET account_status = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING user_id, full_name, email, account_status`,
      [account_status, Number(id)]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "User account status updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Update user status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update account status.",
    });
  } finally {
    client.release();
  }
};

// 6. CHANGE USER ROLE
const updateUserRole = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { role_name } = req.body;

    if (!validateUserId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (!ALLOWED_ROLES.includes(role_name)) {
      return res.status(400).json({
        success: false,
        message: "Role must be Student, Staff or Admin.",
      });
    }

    if (Number(id) === Number(req.user.userId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role.",
      });
    }

    await client.query("BEGIN");

    const targetResult = await client.query(
      `SELECT u.user_id, u.account_status, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1
       FOR UPDATE OF u`,
      [Number(id)]
    );

    if (targetResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const target = targetResult.rows[0];

    // Prevent removal of the last active Admin
    if (
      target.role_name === "Admin" &&
      target.account_status === "active" &&
      role_name !== "Admin"
    ) {
      await client.query(
        `SELECT u.user_id
         FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE r.role_name = 'Admin'
           AND u.account_status = 'active'
         FOR UPDATE OF u`
      );

      const adminCount = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE r.role_name = 'Admin'
           AND u.account_status = 'active'`
      );

      if (adminCount.rows[0].total <= 1) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Cannot change the role of the last active Admin.",
        });
      }
    }

    const roleResult = await client.query(
      "SELECT role_id FROM roles WHERE role_name = $1",
      [role_name]
    );

    if (roleResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Requested role does not exist.",
      });
    }

    const result = await client.query(
      `UPDATE users
       SET role_id = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING user_id, full_name, email, account_status`,
      [roleResult.rows[0].role_id, Number(id)]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "User role updated successfully.",
      data: {
        ...result.rows[0],
        role_name,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Update user role error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update user role.",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  createStaff,
  getAllUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  updateUserRole,
};
