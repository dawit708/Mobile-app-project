
const pool = require("../config/database");

const {
  validateAnnouncementId,
  validateAnnouncement,
} = require("../validators/announcementValidator");

// Helper: check whether a user is an Admin
const isAdmin = (req) => req.user && req.user.role === "Admin";

// Helper: determine the audience visible to the current user
const getAudience = (req) => {
  if (!req.user) {
    return "guest";
  }

  return String(req.user.role).toLowerCase();
};

// CREATE ANNOUNCEMENT
// Admin only
const createAnnouncement = async (req, res) => {
  try {
    const errors = validateAnnouncement(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const {
      title,
      content,
      audience,
      status,
      published_at,
      expires_at,
    } = req.body;

    const result = await pool.query(
      `
INSERT INTO announcements
  (title, content, audience, status, published_at, expires_at, created_by)
VALUES
  ($1, $2, $3, $4,
   COALESCE(
     $5::timestamptz,
     CASE
       WHEN $4::varchar = 'published'::varchar THEN NOW()
       ELSE NULL
     END
   ),
   $6, $7)
RETURNING *
`,
      [
        title.trim(),
        content.trim(),
        audience,
        status,
        published_at || null,
        expires_at || null,
        req.user.userId,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create announcement error:", {
         message: error.message,
    code: error.code,
    detail: error.detail,
    constraint: error.constraint,
    table: error.table,

    } );

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement creator",
      });
    }

    if (error.code === "23514") {
      return res.status(400).json({
        success: false,
        message: "Announcement data violates a database constraint",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create announcement",
    });
  }
};

// GET ALL ANNOUNCEMENTS
// Admin: sees all announcements
// Other users and guests: see published announcements for their audience
const getAllAnnouncements = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );
    const offset = (page - 1) * limit;

    const values = [];
    const conditions = [];

    if (!isAdmin(req)) {
      const audience = getAudience(req);

      conditions.push(
        `audience IN ('all', $${values.length + 1})`
      );
      values.push(audience);

      conditions.push("status = 'published'");
      conditions.push("published_at IS NOT NULL");
      conditions.push("published_at <= NOW()");
      conditions.push("(expires_at IS NULL OR expires_at >= NOW())");
    } else {
      // Optional Admin filters
      if (req.query.status) {
        conditions.push(`status = $${values.length + 1}`);
        values.push(req.query.status);
      }

      if (req.query.audience) {
        conditions.push(`audience = $${values.length + 1}`);
        values.push(req.query.audience);
      }
    }

    // Optional title/content search
    if (req.query.search) {
      conditions.push(
        `(title ILIKE $${values.length + 1}
          OR content ILIKE $${values.length + 1})`
      );
      values.push(`%${req.query.search}%`);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM announcements ${whereClause}`,
      values
    );

    const total = Number(countResult.rows[0].count);

    const dataValues = [...values, limit, offset];

    const result = await pool.query(
      `SELECT
          announcement_id,
          title,
          content,
          audience,
          status,
          published_at,
          expires_at,
          created_by,
          created_at,
          updated_at
       FROM announcements
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      dataValues
    );

    return res.status(200).json({
      success: true,
      message: "Announcements retrieved successfully",
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get announcements error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve announcements",
    });
  }
};

// GET ONE ANNOUNCEMENT BY ID
const getAnnouncementById = async (req, res) => {
  try {
    const idError = validateAnnouncementId(req.params.id);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    const values = [req.params.id];

    let query = `
      SELECT *
      FROM announcements
      WHERE announcement_id = $1
    `;

    if (!isAdmin(req)) {
      const audience = getAudience(req);

      query += `
        AND audience IN ('all', $2)
        AND status = 'published'
        AND published_at IS NOT NULL
        AND published_at <= NOW()
        AND (expires_at IS NULL OR expires_at >= NOW())
      `;

      values.push(audience);
    }

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Announcement retrieved successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get announcement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve announcement",
    });
  }
};

// UPDATE ANNOUNCEMENT
// Admin only
const updateAnnouncement = async (req, res) => {
  try {
    const idError = validateAnnouncementId(req.params.id);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    const errors = validateAnnouncement(req.body, true);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const allowedFields = [
      "title",
      "content",
      "audience",
      "status",
      "published_at",
      "expires_at",
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        let value = req.body[field];

        if (field === "title" || field === "content") {
          value = value.trim();
        }

        if (value === "") {
          value = null;
        }

        values.push(value);
        updates.push(`${field} = $${values.length}`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    // If Admin changes status to published without supplying a date,
    // set the publication date to the current time.
    if (
      req.body.status === "published" &&
      req.body.published_at === undefined
    ) {
      updates.push("published_at = COALESCE(published_at, NOW())");
    }

    updates.push("updated_at = NOW()");

    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE announcements
       SET ${updates.join(", ")}
       WHERE announcement_id = $${values.length}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update announcement error:", error);

    if (error.code === "23514") {
      return res.status(400).json({
        success: false,
        message: "Announcement dates or values violate a database constraint",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update announcement",
    });
  }
};

// DELETE ANNOUNCEMENT
// Admin only
const deleteAnnouncement = async (req, res) => {
  try {
    const idError = validateAnnouncementId(req.params.id);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    const result = await pool.query(
      `DELETE FROM announcements
       WHERE announcement_id = $1
       RETURNING announcement_id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Delete announcement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete announcement",
    });
  }
};

module.exports = {
  createAnnouncement,
  getAllAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
};
