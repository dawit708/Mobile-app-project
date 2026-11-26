
const express = require("express");
const router = express.Router();

const clubController = require("../controllers/clubController");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

/**
 * @swagger
 * tags:
 *   name: Clubs
 *   description: University club management and membership requests
 */

/**
 * @swagger
 * /api/clubs:
 *   get:
 *     summary: Get all active clubs
 *     tags: [Clubs]
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
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Clubs retrieved successfully
 *       500:
 *         description: Server error
 *
 *   post:
 *     summary: Create a club
 *     tags: [Clubs]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - club_name
 *             properties:
 *               club_name:
 *                 type: string
 *                 example: Coding Club
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: A club for programming and technology.
 *               category:
 *                 type: string
 *                 nullable: true
 *                 example: Technology
 *               contact_email:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *                 example: coding@example.com
 *               image_url:
 *                 type: string
 *                 nullable: true
 *                 example: https://example.com/coding-club.jpg
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: active
 *     responses:
 *       201:
 *         description: Club created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       409:
 *         description: Club name already exists
 *       500:
 *         description: Server error
 *
 * /api/clubs/admin/all:
 *   get:
 *     summary: Get all clubs including inactive clubs
 *     tags: [Clubs]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only.
 *     responses:
 *       200:
 *         description: All clubs retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 *
 * /api/clubs/my-memberships:
 *   get:
 *     summary: Get my club memberships
 *     tags: [Clubs]
 *     security:
 *       - bearerAuth: []
 *     description: Student only.
 *     responses:
 *       200:
 *         description: Memberships retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Student access required
 *       500:
 *         description: Server error
 *
 * /api/clubs/{id}:
 *   get:
 *     summary: Get club details
 *     tags: [Clubs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Club retrieved successfully
 *       400:
 *         description: Invalid club ID
 *       404:
 *         description: Active club not found
 *       500:
 *         description: Server error
 *
 *   put:
 *     summary: Update a club
 *     tags: [Clubs]
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
 *               club_name:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               category:
 *                 type: string
 *                 nullable: true
 *               contact_email:
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
 *         description: Club updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Club not found
 *       409:
 *         description: Club name already exists
 *       500:
 *         description: Server error
 *
 *   delete:
 *     summary: Delete a club
 *     tags: [Clubs]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only. Related membership rows are deleted by the database cascade.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Club deleted successfully
 *       400:
 *         description: Invalid club ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Club not found
 *       500:
 *         description: Server error
 *
 * /api/clubs/{id}/join:
 *   post:
 *     summary: Request to join a club
 *     tags: [Clubs]
 *     security:
 *       - bearerAuth: []
 *     description: Student only. Creates a pending membership request.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Membership request submitted
 *       400:
 *         description: Invalid club ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Student access required
 *       404:
 *         description: Active club not found
 *       409:
 *         description: Existing membership or request
 *       500:
 *         description: Server error
 *
 * /api/clubs/{id}/memberships:
 *   get:
 *     summary: Get membership requests for a club
 *     tags: [Clubs]
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
 *         description: Membership requests retrieved
 *       400:
 *         description: Invalid club ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 *
 * /api/clubs/memberships/{membershipId}/approve:
 *   patch:
 *     summary: Approve a club membership request
 *     tags: [Clubs]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only.
 *     parameters:
 *       - in: path
 *         name: membershipId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Membership approved
 *       400:
 *         description: Invalid membership ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Pending membership not found
 *       500:
 *         description: Server error
 *
 * /api/clubs/memberships/{membershipId}/reject:
 *   delete:
 *     summary: Reject a pending membership request
 *     tags: [Clubs]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Admin only. Removes the pending request because the verified
 *       database constraint has not confirmed a rejected status.
 *     parameters:
 *       - in: path
 *         name: membershipId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pending request removed
 *       400:
 *         description: Invalid membership ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Pending request not found
 *       500:
 *         description: Server error
 */

// PUBLIC CLUB ROUTES
router.get("/", clubController.getAllClubs);
router.get("/:id", clubController.getClubById);

// ADMIN CLUB ROUTES
router.post(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  clubController.createClub
);

router.get(
  "/admin/all",
  authenticateToken,
  authorizeRoles("Admin"),
  clubController.getAllClubsForAdmin
);

router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  clubController.updateClub
);

router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  clubController.deleteClub
);

// STUDENT MEMBERSHIP ROUTES
router.get(
  "/my-memberships",
  authenticateToken,
  authorizeRoles("Student"),
  clubController.getMyClubMemberships
);

router.post(
  "/:id/join",
  authenticateToken,
  authorizeRoles("Student"),
  clubController.requestClubMembership
);

// ADMIN MEMBERSHIP MANAGEMENT
router.get(
  "/:id/memberships",
  authenticateToken,
  authorizeRoles("Admin"),
  clubController.getClubMemberships
);

router.patch(
  "/memberships/:membershipId/approve",
  authenticateToken,
  authorizeRoles("Admin"),
  clubController.approveMembership
);

router.delete(
  "/memberships/:membershipId/reject",
  authenticateToken,
  authorizeRoles("Admin"),
  clubController.rejectMembership
);

module.exports = router;
