const express = require("express");
const router = express.Router();

// Controllers
const controller = require("../controllers/serviceCategoryController");

// Middleware
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// Validator
const { validateCategory } = require("../validators/serviceCategoryValidator");

// GET active categories
router.get(
  "/",
  authenticateToken,
  authorizeRoles("Student", "Staff", "Admin"),
  controller.getCategories
);

// GET all categories (Admin only)
router.get(
  "/admin/all",
  authenticateToken,
  authorizeRoles("Admin"),
  controller.getAllCategories
);

// CREATE category (Admin only)
router.post(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  validateCategory,
  controller.createCategory
);

// UPDATE category (Admin only)
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  validateCategory,
  controller.updateCategory
);

// ACTIVATE / DEACTIVATE category (Admin only)
router.patch(
  "/:id/status",
  authenticateToken,
  authorizeRoles("Admin"),
  controller.updateCategoryStatus
);

module.exports = router;