const pool = require("../config/database");

// GET all active categories
const getCategories = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT category_id, category_name, description, is_active
       FROM service_categories
       WHERE is_active = TRUE
       ORDER BY category_id ASC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// GET all categories, including inactive ones (Admin)
const getAllCategories = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT category_id, category_name, description, is_active
       FROM service_categories
       ORDER BY category_id ASC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// CREATE category (Admin)
const createCategory = async (req, res, next) => {
  try {
    const { category_name, description } = req.body;

    const result = await pool.query(
      `INSERT INTO service_categories
       (category_name, description, is_active)
       VALUES ($1, $2, TRUE)
       RETURNING category_id, category_name, description, is_active`,
      [category_name.trim(), description?.trim() || null]
    );

    return res.status(201).json({
      success: true,
      message: "Service category created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A category with this name already exists.",
      });
    }

    next(error);
  }
};

// UPDATE category (Admin)
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_name, description } = req.body;

    const result = await pool.query(
      `UPDATE service_categories
       SET category_name = $1,
           description = $2
       WHERE category_id = $3
       RETURNING category_id, category_name, description, is_active`,
      [
        category_name.trim(),
        description?.trim() || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Service category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service category updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A category with this name already exists.",
      });
    }

    next(error);
  }
};

// ACTIVATE / DEACTIVATE category (Admin)
const updateCategoryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_active must be true or false.",
      });
    }

    const result = await pool.query(
      `UPDATE service_categories
       SET is_active = $1
       WHERE category_id = $2
       RETURNING category_id, category_name, description, is_active`,
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Service category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category status updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
};