
const express = require("express");
const router = express.Router();

const facilityController = require("../controllers/facilityController");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

/**
 * @swagger
 * tags:
 *   name: Facilities
 *   description: University campus facilities management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Facility:
 *       type: object
 *       properties:
 *         facility_id:
 *           type: integer
 *           example: 1
 *         facility_name:
 *           type: string
 *           example: Main Library
 *         description:
 *           type: string
 *           nullable: true
 *         category:
 *           type: string
 *           nullable: true
 *           example: Library
 *         building_name:
 *           type: string
 *           nullable: true
 *           example: Block A
 *         location_description:
 *           type: string
 *           nullable: true
 *           example: Near the main entrance
 *         latitude:
 *           type: number
 *           nullable: true
 *           example: 11.0833
 *         longitude:
 *           type: number
 *           nullable: true
 *           example: 36.0333
 *         contact_number:
 *           type: string
 *           nullable: true
 *         opening_hours:
 *           type: string
 *           nullable: true
 *         image_url:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *         created_by:
 *           type: integer
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/facilities:
 *   get:
 *     summary: Get active facilities
 *     tags: [Facilities]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by facility name, description, category, or location
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Facilities retrieved successfully
 *       500:
 *         description: Server error
 *
 *   post:
 *     summary: Create a facility
 *     tags: [Facilities]
 *     description: Admin only.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - facility_name
 *             properties:
 *               facility_name:
 *                 type: string
 *                 example: Main Library
 *               description:
 *                 type: string
 *                 nullable: true
 *               category:
 *                 type: string
 *                 nullable: true
 *                 example: Library
 *               building_name:
 *                 type: string
 *                 nullable: true
 *                 example: Block A
 *               location_description:
 *                 type: string
 *                 nullable: true
 *                 example: Near the main gate
 *               latitude:
 *                 type: number
 *                 nullable: true
 *                 example: 11.0833
 *               longitude:
 *                 type: number
 *                 nullable: true
 *                 example: 36.0333
 *               contact_number:
 *                 type: string
 *                 nullable: true
 *               opening_hours:
 *                 type: string
 *                 nullable: true
 *                 example: Monday-Friday, 8:00 AM-5:00 PM
 *               image_url:
 *                 type: string
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *     responses:
 *       201:
 *         description: Facility created successfully
 *       400:
 *         description: Validation or database constraint error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 *
 * /api/facilities/admin/all:
 *   get:
 *     summary: Get all facilities including inactive facilities
 *     tags: [Facilities]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *     responses:
 *       200:
 *         description: All facilities retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 *
 * /api/facilities/{id}:
 *   get:
 *     summary: Get facility details
 *     tags: [Facilities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Facility retrieved successfully
 *       400:
 *         description: Invalid facility ID
 *       404:
 *         description: Active facility not found
 *       500:
 *         description: Server error
 *
 *   put:
 *     summary: Update a facility
 *     tags: [Facilities]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               facility_name:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               category:
 *                 type: string
 *                 nullable: true
 *               building_name:
 *                 type: string
 *                 nullable: true
 *               location_description:
 *                 type: string
 *                 nullable: true
 *               latitude:
 *                 type: number
 *                 nullable: true
 *               longitude:
 *                 type: number
 *                 nullable: true
 *               contact_number:
 *                 type: string
 *                 nullable: true
 *               opening_hours:
 *                 type: string
 *                 nullable: true
 *               image_url:
 *                 type: string
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Facility updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Facility not found
 *       500:
 *         description: Server error
 *
 *   delete:
 *     summary: Delete a facility
 *     tags: [Facilities]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Facility deleted successfully
 *       400:
 *         description: Invalid facility ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Facility not found
 *       500:
 *         description: Server error
 */

// PUBLIC ROUTES
router.get("/", facilityController.getAllFacilities);

// ADMIN ROUTES - register before /:id
router.get(
  "/admin/all",
  authenticateToken,
  authorizeRoles("Admin"),
  facilityController.getAllFacilitiesForAdmin
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  facilityController.createFacility
);

router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  facilityController.updateFacility
);

router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  facilityController.deleteFacility
);

// PUBLIC DETAILS ROUTE - keep last
router.get("/:id", facilityController.getFacilityById);

module.exports = router;
