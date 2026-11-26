
const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

const announcementController = require("../controllers/announcementController");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// Optional authentication for public announcement routes
const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const tokenParts = authHeader.split(" ");

  if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
    return res.status(401).json({
      success: false,
      message: "Invalid authorization format",
    });
  }

  jwt.verify(
    tokenParts[1],
    process.env.JWT_ACCESS_SECRET,
    (error, decoded) => {
      if (error) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired access token",
        });
      }

      req.user = decoded;
      next();
    }
  );
};

/**
 * @swagger
 * tags:
 *   name: Announcements
 *   description: University announcement management
 */

/**
 * @swagger
 * /api/announcements:
 *   post:
 *     summary: Create a new announcement
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only. Creates an announcement.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - audience
 *               - status
 *             properties:
 *               title:
 *                 type: string
 *                 example: Campus Meeting
 *               content:
 *                 type: string
 *                 example: All students are invited to the campus meeting.
 *               audience:
 *                 type: string
 *                 enum: [all, student, staff, guest]
 *                 example: student
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *                 example: published
 *               published_at:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: "2026-11-26T10:00:00Z"
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: "2026-12-10T10:00:00Z"
 *     responses:
 *       201:
 *         description: Announcement created successfully
 *       400:
 *         description: Validation or database constraint error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 *
 *   get:
 *     summary: Get announcements
 *     tags: [Announcements]
 *     security: []
 *     description: >
 *       Public endpoint. Guests can access without a token.
 *       Authenticated users receive announcements intended for their role.
 *       Admins can view all announcements.
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
 *           maximum: 100
 *         description: Number of results per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search announcement title or content
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Admin-only status filter
 *       - in: query
 *         name: audience
 *         schema:
 *           type: string
 *           enum: [all, student, staff, guest]
 *         description: Admin-only audience filter
 *     responses:
 *       200:
 *         description: Announcements retrieved successfully
 *       401:
 *         description: Invalid or expired token
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/announcements/{id}:
 *   get:
 *     summary: Get one announcement
 *     tags: [Announcements]
 *     security: []
 *     description: Public access to published announcements intended for the visitor's role. Admins can view any announcement.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Announcement ID
 *     responses:
 *       200:
 *         description: Announcement retrieved successfully
 *       400:
 *         description: Invalid announcement ID
 *       401:
 *         description: Invalid or expired token
 *       404:
 *         description: Announcement not found
 *       500:
 *         description: Server error
 *
 *   put:
 *     summary: Update an announcement
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only. Updates an existing announcement.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Announcement ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated Campus Meeting
 *               content:
 *                 type: string
 *                 example: The campus meeting time has changed.
 *               audience:
 *                 type: string
 *                 enum: [all, student, staff, guest]
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *               published_at:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Announcement updated successfully
 *       400:
 *         description: Validation or database constraint error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Announcement not found
 *       500:
 *         description: Server error
 *
 *   delete:
 *     summary: Delete an announcement
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only. Permanently deletes an announcement.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Announcement ID
 *     responses:
 *       200:
 *         description: Announcement deleted successfully
 *       400:
 *         description: Invalid announcement ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Announcement not found
 *       500:
 *         description: Server error
 */

// PUBLIC ROUTES
router.get(
  "/",
  optionalAuthenticate,
  announcementController.getAllAnnouncements
);

router.get(
  "/:id",
  optionalAuthenticate,
  announcementController.getAnnouncementById
);

// ADMIN ROUTES
router.post(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  announcementController.createAnnouncement
);

router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  announcementController.updateAnnouncement
);

router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  announcementController.deleteAnnouncement
);

module.exports = router;
