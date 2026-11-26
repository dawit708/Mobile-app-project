
const pool = require("../config/database");

const {
  validateEventId,
  validateEvent,
} = require("../validators/eventValidator");

// Check whether the logged-in user is an Admin
const isAdmin = (req) => {
  return req.user && req.user.role === "Admin";
};

// CREATE EVENT
// Admin only
const createEvent = async (req, res) => {
  try {
    const errors = validateEvent(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const {
      title,
      description,
      location,
      start_date,
      end_date,
      registration_deadline,
      capacity,
      image_url,
      status,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO events (
        title,
        description,
        location,
        start_date,
        end_date,
        registration_deadline,
        capacity,
        image_url,
        status,
        created_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
      RETURNING *`,
      [
        title.trim(),
        description || null,
        location || null,
        start_date,
        end_date,
        registration_deadline || null,
        capacity ?? null,
        image_url || null,
        status,
        req.user.userId,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create event error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
    });

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Invalid event creator",
      });
    }

    if (error.code === "23514") {
      return res.status(400).json({
        success: false,
        message: "Event data violates a database constraint",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create event",
    });
  }
};

// GET ALL EVENTS
// Admin sees all events.
// Other visitors see published events only.
const getAllEvents = async (req, res) => {
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
      conditions.push("status = 'published'");
    } else {
      if (req.query.status) {
        conditions.push(`status = $${values.length + 1}::varchar`);
        values.push(req.query.status);
      }
    }

    if (req.query.search) {
      values.push(`%${req.query.search}%`);

      conditions.push(
        `(title ILIKE $${values.length}
          OR description ILIKE $${values.length}
          OR location ILIKE $${values.length})`
      );
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const countResult = await pool.query(
      `SELECT COUNT(*)
       FROM events
       ${whereClause}`,
      values
    );

    const total = Number(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT *
       FROM events
       ${whereClause}
       ORDER BY start_date ASC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Events retrieved successfully",
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get events error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve events",
    });
  }
};

// GET EVENT BY ID
const getEventById = async (req, res) => {
  try {
    const idError = validateEventId(req.params.id);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    let query = `
      SELECT *
      FROM events
      WHERE event_id = $1
    `;

    if (!isAdmin(req)) {
      query += ` AND status = 'published'`;
    }

    const result = await pool.query(query, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Event retrieved successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get event error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve event",
    });
  }
};

// UPDATE EVENT
// Admin only
const updateEvent = async (req, res) => {
  try {
    const idError = validateEventId(req.params.id);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    const errors = validateEvent(req.body, true);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const allowedFields = [
      "title",
      "description",
      "location",
      "start_date",
      "end_date",
      "registration_deadline",
      "capacity",
      "image_url",
      "status",
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        let value = req.body[field];

        if (
          ["description", "location", "image_url",
            "registration_deadline", "capacity"].includes(field) &&
          value === ""
        ) {
          value = null;
        }

        if (field === "title") {
          value = value.trim();
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

    updates.push("updated_at = NOW()");

    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE events
       SET ${updates.join(", ")}
       WHERE event_id = $${values.length}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update event error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
    });

    if (error.code === "23514") {
      return res.status(400).json({
        success: false,
        message: "Event dates, capacity, or status violate a database constraint",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update event",
    });
  }
};

// DELETE EVENT
// Admin only
const deleteEvent = async (req, res) => {
  try {
    const idError = validateEventId(req.params.id);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    const result = await pool.query(
      `DELETE FROM events
       WHERE event_id = $1
       RETURNING event_id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Delete event error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete event",
    });
  }
};

// STUDENT EVENT REGISTRATION
const registerForEvent = async (req, res) => {
  const client = await pool.connect();

  try {
    const idError = validateEventId(req.params.id);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    await client.query("BEGIN");

    // Lock event row to prevent simultaneous registrations
    const eventResult = await client.query(
      `SELECT *
       FROM events
       WHERE event_id = $1
       FOR UPDATE`,
      [req.params.id]
    );

    if (eventResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const event = eventResult.rows[0];

    if (event.status !== "published") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Registration is available only for published events",
      });
    }

    if (new Date(event.start_date) <= new Date()) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Registration is closed because the event has started",
      });
    }

    if (
      event.registration_deadline &&
      new Date(event.registration_deadline) <= new Date()
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "The event registration deadline has passed",
      });
    }

    // Check for an existing registration
    const existingResult = await client.query(
      `SELECT *
       FROM event_registrations
       WHERE event_id = $1 AND user_id = $2
       FOR UPDATE`,
      [req.params.id, req.user.userId]
    );

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];

      if (existing.registration_status === "registered") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message: "You are already registered for this event",
        });
      }

      if (existing.registration_status === "attended") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message: "You have already attended this event",
        });
      }
    }

    // Check event capacity
    if (event.capacity !== null) {
      const countResult = await client.query(
        `SELECT COUNT(*) AS total
         FROM event_registrations
         WHERE event_id = $1
         AND registration_status = 'registered'`,
        [req.params.id]
      );

      const registeredCount = Number(countResult.rows[0].total);

      if (registeredCount >= event.capacity) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "This event has reached its registration capacity",
        });
      }
    }

    let registrationResult;

    if (existingResult.rows.length > 0) {
      // Reactivate a previously cancelled registration
      registrationResult = await client.query(
        `UPDATE event_registrations
         SET registration_status = 'registered',
             registered_at = NOW()
         WHERE event_id = $1 AND user_id = $2
         RETURNING *`,
        [req.params.id, req.user.userId]
      );
    } else {
      registrationResult = await client.query(
        `INSERT INTO event_registrations
          (event_id, user_id, registration_status, registered_at)
         VALUES ($1, $2, 'registered', NOW())
         RETURNING *`,
        [req.params.id, req.user.userId]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Event registration successful",
      data: registrationResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Event registration error:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to register for event",
    });
  } finally {
    client.release();
  }
};

// CANCEL EVENT REGISTRATION
const cancelEventRegistration = async (req, res) => {
  try {
    const idError = validateEventId(req.params.id);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    const result = await pool.query(
      `UPDATE event_registrations
       SET registration_status = 'cancelled'
       WHERE event_id = $1
         AND user_id = $2
         AND registration_status = 'registered'
       RETURNING *`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Active event registration not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Event registration cancelled successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Cancel registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel event registration",
    });
  }
};

// GET MY EVENT REGISTRATIONS
const getMyRegistrations = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          er.registration_id,
          er.event_id,
          er.user_id,
          er.registration_status,
          er.registered_at,
          e.title,
          e.description,
          e.location,
          e.start_date,
          e.end_date,
          e.status AS event_status
       FROM event_registrations er
       INNER JOIN events e ON e.event_id = er.event_id
       WHERE er.user_id = $1
       ORDER BY er.registered_at DESC`,
      [req.user.userId]
    );

    return res.status(200).json({
      success: true,
      message: "Your event registrations retrieved successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Get registrations error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your registrations",
    });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelEventRegistration,
  getMyRegistrations,
};
