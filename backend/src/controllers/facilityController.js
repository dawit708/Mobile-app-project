
const pool = require("../config/database");

const {
  validateFacilityId,
  validateFacility,
} = require("../validators/facilityValidator");


const createFacility = async (req, res) => {
  try {
    const errors = validateFacility(req.body);

    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const {
      facility_name,
      description = null,
      category = null,
      building_name = null,
      location_description = null,
      latitude = null,
      longitude = null,
      contact_number = null,
      opening_hours = null,
      image_url = null,
      status = "active",
    } = req.body;

    const result = await pool.query(
      `INSERT INTO facilities (
        facility_name,
        description,
        category,
        building_name,
        location_description,
        latitude,
        longitude,
        contact_number,
        opening_hours,
        image_url,
        status,
        created_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12
      )
      RETURNING *`,
      [
        facility_name.trim(),
        description,
        category,
        building_name,
        location_description,
        latitude,
        longitude,
        contact_number,
        opening_hours,
        image_url,
        status,
        req.user.userId,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Facility created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create facility error:", error);

    if (error.code === "23514") {
      return res.status(400).json({
        success: false,
        message: "Facility data violates a database constraint",
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Invalid creator user ID",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create facility",
    });
  }
};

// PUBLIC: GET ACTIVE FACILITIES
const getAllFacilities = async (req, res) => {
  try {
    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );

    const offset = (page - 1) * limit;

    const conditions = ["status = 'active'"];
    const values = [];

    if (req.query.search) {
      values.push(`%${req.query.search}%`);
      const index = values.length;

      conditions.push(`
        (
          facility_name ILIKE $${index}
          OR description ILIKE $${index}
          OR category ILIKE $${index}
          OR building_name ILIKE $${index}
          OR location_description ILIKE $${index}
        )
      `);
    }

    if (req.query.category) {
      values.push(req.query.category);
      conditions.push(`category = $${values.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const countResult = await pool.query(
      `SELECT COUNT(*)
       FROM facilities
       ${whereClause}`,
      values
    );

    const result = await pool.query(
      `SELECT *
       FROM facilities
       ${whereClause}
       ORDER BY facility_name ASC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    const total = Number(countResult.rows[0].count);

    return res.status(200).json({
      success: true,
      message: "Facilities retrieved successfully",
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get facilities error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve facilities",
    });
  }
};

// ADMIN: GET ALL FACILITIES INCLUDING INACTIVE
const getAllFacilitiesForAdmin = async (req, res) => {
  try {
    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );

    const offset = (page - 1) * limit;

    const values = [];
    const conditions = [];

    if (req.query.search) {
      values.push(`%${req.query.search}%`);
      const index = values.length;

      conditions.push(`
        (
          facility_name ILIKE $${index}
          OR description ILIKE $${index}
          OR category ILIKE $${index}
          OR building_name ILIKE $${index}
        )
      `);
    }

    if (req.query.category) {
      values.push(req.query.category);
      conditions.push(`category = $${values.length}`);
    }

    if (req.query.status) {
      if (!["active", "inactive"].includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid facility status",
        });
      }

      values.push(req.query.status);
      conditions.push(`status = $${values.length}`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM facilities ${whereClause}`,
      values
    );

    const result = await pool.query(
      `SELECT *
       FROM facilities
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    const total = Number(countResult.rows[0].count);

    return res.status(200).json({
      success: true,
      message: "All facilities retrieved successfully",
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin get facilities error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve facilities",
    });
  }
};

// PUBLIC: GET ONE ACTIVE FACILITY
const getFacilityById = async (req, res) => {
  try {
    const idError = validateFacilityId(req.params.id);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    const result = await pool.query(
      `SELECT *
       FROM facilities
       WHERE facility_id = $1
         AND status = 'active'`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Active facility not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Facility retrieved successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get facility error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve facility",
    });
  }
};

// ADMIN: UPDATE FACILITY
const updateFacility = async (req, res) => {
  try {
    const idError = validateFacilityId(req.params.id);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    const errors = validateFacility(req.body, true);

    if (errors.length) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const allowedFields = [
      "facility_name",
      "description",
      "category",
      "building_name",
      "location_description",
      "latitude",
      "longitude",
      "contact_number",
      "opening_hours",
      "image_url",
      "status",
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        let value = req.body[field];

        if (
          typeof value === "string" &&
          value.trim() === "" &&
          field !== "facility_name"
        ) {
          value = null;
        }

        if (field === "facility_name" && typeof value === "string") {
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
      `UPDATE facilities
       SET ${updates.join(", ")}
       WHERE facility_id = $${values.length}
       RETURNING *`,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Facility not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Facility updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update facility error:", error);

    if (error.code === "23514") {
      return res.status(400).json({
        success: false,
        message: "Facility data violates a database constraint",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update facility",
    });
  }
};

// ADMIN: DELETE FACILITY
const deleteFacility = async (req, res) => {
  try {
    const idError = validateFacilityId(req.params.id);

    if (idError) {
      return res.status(400).json({
        success: false,
        message: idError,
      });
    }

    const result = await pool.query(
      `DELETE FROM facilities
       WHERE facility_id = $1
       RETURNING facility_id`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Facility not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Facility deleted successfully",
    });
  } catch (error) {
    console.error("Delete facility error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete facility",
    });
  }
};

module.exports = {
  createFacility,
  getAllFacilities,
  getAllFacilitiesForAdmin,
  getFacilityById,
  updateFacility,
  deleteFacility,
};
