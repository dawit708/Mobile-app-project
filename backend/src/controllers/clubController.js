
const pool = require("../config/database");

const {
  validateClubId,
  validateClub,
  validateMembershipId,
} = require("../validators/clubValidator");

// ADMIN: CREATE CLUB
const createClub = async (req, res) => {
  try {
    const errors = validateClub(req.body);

    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const {
      club_name,
      description,
      category,
      contact_email,
      image_url,
      status = "active",
    } = req.body;

    const result = await pool.query(
      `INSERT INTO clubs (
        club_name,
        description,
        category,
        contact_email,
        image_url,
        status,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        club_name.trim(),
        description ?? null,
        category ?? null,
        contact_email || null,
        image_url ?? null,
        status,
        req.user.userId,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Club created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create club error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A club with this name already exists",
      });
    }

    if (error.code === "23503" || error.code === "23514") {
      return res.status(400).json({
        success: false,
        message: "Club data violates a database constraint",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create club",
    });
  }
};

// PUBLIC: GET ACTIVE CLUBS
const getAllClubs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );
    const offset = (page - 1) * limit;

    const values = [];
    const conditions = ["status = 'active'"];

    if (req.query.search) {
      values.push(`%${req.query.search}%`);
      const index = values.length;

      conditions.push(
        `(club_name ILIKE $${index}
          OR description ILIKE $${index}
          OR category ILIKE $${index})`
      );
    }

    if (req.query.category) {
      values.push(req.query.category);
      conditions.push(`category = $${values.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM clubs ${whereClause}`,
      values
    );

    const result = await pool.query(
      `SELECT *
       FROM clubs
       ${whereClause}
       ORDER BY club_name ASC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    const total = Number(countResult.rows[0].count);

    return res.status(200).json({
      success: true,
      message: "Clubs retrieved successfully",
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get clubs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve clubs",
    });
  }
};

// ADMIN: GET ALL CLUBS INCLUDING INACTIVE
const getAllClubsForAdmin = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM clubs
       ORDER BY created_at DESC`
    );

    return res.status(200).json({
      success: true,
      message: "All clubs retrieved successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Admin get clubs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve clubs",
    });
  }
};

// PUBLIC: GET CLUB DETAILS
const getClubById = async (req, res) => {
  try {
    const idError = validateClubId(req.params.id);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM clubs
       WHERE club_id = $1
         AND status = 'active'`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Club not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Club retrieved successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get club error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve club",
    });
  }
};

// ADMIN: UPDATE CLUB
const updateClub = async (req, res) => {
  try {
    const idError = validateClubId(req.params.id);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    const errors = validateClub(req.body, true);

    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const allowedFields = [
      "club_name",
      "description",
      "category",
      "contact_email",
      "image_url",
      "status",
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        let value = req.body[field];

        if (
          ["description", "category", "contact_email", "image_url"].includes(field) &&
          value === ""
        ) {
          value = null;
        }

        if (field === "club_name") {
          value = value.trim();
        }

        values.push(value);
        updates.push(`${field} = $${values.length}`);
      }
    }

    if (!updates.length) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    updates.push("updated_at = NOW()");
    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE clubs
       SET ${updates.join(", ")}
       WHERE club_id = $${values.length}
       RETURNING *`,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Club not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Club updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update club error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A club with this name already exists",
      });
    }

    if (error.code === "23514") {
      return res.status(400).json({
        success: false,
        message: "Invalid club status",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update club",
    });
  }
};

// ADMIN: DELETE CLUB
const deleteClub = async (req, res) => {
  try {
    const idError = validateClubId(req.params.id);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    const result = await pool.query(
      `DELETE FROM clubs
       WHERE club_id = $1
       RETURNING club_id`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Club not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Club deleted successfully",
    });
  } catch (error) {
    console.error("Delete club error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete club",
    });
  }
};

// STUDENT: REQUEST TO JOIN A CLUB
const requestClubMembership = async (req, res) => {
  const client = await pool.connect();

  try {
    const idError = validateClubId(req.params.id);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    await client.query("BEGIN");

    const clubResult = await client.query(
      `SELECT club_id, club_name
       FROM clubs
       WHERE club_id = $1
         AND status = 'active'
       FOR UPDATE`,
      [req.params.id]
    );

    if (!clubResult.rows.length) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Active club not found",
      });
    }

    const existingResult = await client.query(
      `SELECT membership_id, membership_status
       FROM club_memberships
       WHERE club_id = $1 AND user_id = $2
       FOR UPDATE`,
      [req.params.id, req.user.userId]
    );

    if (existingResult.rows.length) {
      const existing = existingResult.rows[0];

      await client.query("ROLLBACK");

      if (existing.membership_status === "approved") {
        return res.status(409).json({
          success: false,
          message: "You are already a member of this club",
        });
      }

      return res.status(409).json({
        success: false,
        message: "You already have a pending membership request",
      });
    }

    const result = await client.query(
      `INSERT INTO club_memberships (
        club_id,
        user_id,
        membership_status,
        joined_at
      )
      VALUES ($1, $2, 'pending', NOW())
      RETURNING *`,
      [req.params.id, req.user.userId]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Club membership request submitted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    console.error("Club membership request error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A membership request already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to submit membership request",
    });
  } finally {
    client.release();
  }
};

// STUDENT: VIEW MY CLUB MEMBERSHIPS
const getMyClubMemberships = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          cm.membership_id,
          cm.club_id,
          cm.user_id,
          cm.membership_status,
          cm.joined_at,
          c.club_name,
          c.description,
          c.category,
          c.image_url,
          c.status AS club_status
       FROM club_memberships cm
       INNER JOIN clubs c ON c.club_id = cm.club_id
       WHERE cm.user_id = $1
       ORDER BY cm.joined_at DESC`,
      [req.user.userId]
    );

    return res.status(200).json({
      success: true,
      message: "Your club memberships retrieved successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Get my memberships error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your memberships",
    });
  }
};

// ADMIN: VIEW ALL MEMBERSHIP REQUESTS
const getClubMemberships = async (req, res) => {
  try {
    const idError = validateClubId(req.params.id);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    const result = await pool.query(
      `SELECT
          cm.membership_id,
          cm.club_id,
          cm.user_id,
          cm.membership_status,
          cm.joined_at,
          u.full_name,
          u.email
       FROM club_memberships cm
       INNER JOIN users u ON u.user_id = cm.user_id
       WHERE cm.club_id = $1
       ORDER BY cm.joined_at DESC`,
      [req.params.id]
    );

    return res.status(200).json({
      success: true,
      message: "Club membership requests retrieved successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Get club memberships error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve club memberships",
    });
  }
};

// ADMIN: APPROVE MEMBERSHIP REQUEST
const approveMembership = async (req, res) => {
  try {
    const idError = validateMembershipId(req.params.membershipId);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    const result = await pool.query(
      `UPDATE club_memberships
       SET membership_status = 'approved'
       WHERE membership_id = $1
         AND membership_status = 'pending'
       RETURNING *`,
      [req.params.membershipId]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Pending membership request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Club membership approved successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Approve membership error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve membership",
    });
  }
};

// ADMIN: REJECT MEMBERSHIP REQUEST
// The verified screenshot does not show a rejected status.
// Therefore, rejection removes the pending request.
const rejectMembership = async (req, res) => {
  try {
    const idError = validateMembershipId(req.params.membershipId);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    const result = await pool.query(
      `DELETE FROM club_memberships
       WHERE membership_id = $1
         AND membership_status = 'pending'
       RETURNING membership_id`,
      [req.params.membershipId]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Pending membership request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Membership request rejected and removed successfully",
    });
  } catch (error) {
    console.error("Reject membership error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject membership request",
    });
  }
};

module.exports = {
  createClub,
  getAllClubs,
  getAllClubsForAdmin,
  getClubById,
  updateClub,
  deleteClub,
  requestClubMembership,
  getMyClubMemberships,
  getClubMemberships,
  approveMembership,
  rejectMembership,
};
