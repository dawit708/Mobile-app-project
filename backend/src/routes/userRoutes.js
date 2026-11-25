
const express = require("express");

const router = express.Router();

const userController = require("../controllers/userController");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

/**
 * @swagger
 * tags:
 *   name: User Management
 *   description: Admin user management operations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         user_id:
 *           type: integer
 *           example: 2
 *         full_name:
 *           type: string
 *           example: Test Staff
 *         email:
 *           type: string
 *           example: staff@example.com
 *         phone_number:
 *           type: string
 *           example: "0912345678"
 *         account_status:
 *           type: string
 *           enum: [active, inactive, suspended]
 *           example: active
 *         role_name:
 *           type: string
 *           example: Staff
 */

/**
 * @swagger
 * /api/users/staff:
 *   post:
 *     summary: Create a new Staff account
 *     description: Allows an authenticated Admin to create a Staff account.
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - email
 *               - password
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: Test Staff
 *               email:
 *                 type: string
 *                 example: staff@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StaffTest123
 *               phone_number:
 *                 type: string
 *                 example: "0912345678"
 *     responses:
 *       201:
 *         description: Staff account created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin permission required
 *       409:
 *         description: Email already exists
 */
router.post("/staff", authenticateToken, authorizeRoles("Admin"), userController.createStaff);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all registered users
 *     description: Returns a paginated list of users. Supports search, role and status filters.
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users per page (maximum 100)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by user name or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role name
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: Filter by account status
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin permission required
 */
router.get("/", authenticateToken, authorizeRoles("Admin"), userController.getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user details by ID
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin permission required
 *       404:
 *         description: User not found
 */
router.get("/:id", authenticateToken, authorizeRoles("Admin"), userController.getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user information
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: Updated User
 *               email:
 *                 type: string
 *                 example: updated@example.com
 *               phone_number:
 *                 type: string
 *                 example: "0912345678"
 *     responses:
 *       200:
 *         description: User information updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin permission required
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already exists
 */
router.put("/:id", authenticateToken, authorizeRoles("Admin"), userController.updateUser);

/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     summary: Change user account status
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - account_status
 *             properties:
 *               account_status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *                 example: suspended
 *     responses:
 *       200:
 *         description: Account status updated successfully
 *       400:
 *         description: Invalid status or last Admin protection
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin permission required
 *       404:
 *         description: User not found
 */
router.patch("/:id/status", authenticateToken, authorizeRoles("Admin"), userController.updateUserStatus);

/**
 * @swagger
 * /api/users/{id}/role:
 *   patch:
 *     summary: Change user role
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role_name
 *             properties:
 *               role_name:
 *                 type: string
 *                 enum: [Student, Staff, Admin]
 *                 example: Staff
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Invalid role or last Admin protection
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin permission required
 *       404:
 *         description: User not found
 */
router.patch("/:id/role", authenticateToken, authorizeRoles("Admin"), userController.updateUserRole);

module.exports = router;
