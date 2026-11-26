
const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

const eventController = require("../controllers/eventController");
const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// Optional authentication for public event browsing.
// Guests can access without a token.
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
 *   name: Events
 *   description: University event management and student registrations
 */

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create an event
 *     tags: [Events]
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
 *               - title
 *               - start_date
 *               - end_date
 *               - status
 *             properties:
 *               title:
 *                 type: string
 *                 example: Campus Technology Day
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: A university technology event.
 *               location:
 *                 type: string
 *                 nullable: true
 *                 example: Main Campus
 *               start_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-12-10T09:00:00Z"
 *               end_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-12-10T16:00:00Z"
 *               registration_deadline:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: "2026-12-08T18:00:00Z"
 *               capacity:
 *                 type: integer
 *                 nullable: true
 *                 example: 100
 *               image_url:
 *                 type: string
 *                 nullable: true
 *                 example: "https://example.com/event.jpg"
 *               status:
 *                 type: string
 *                 enum: [draft, published, cancelled, completed]
 *                 example: published
 *     responses:
 *       201:
 *         description: Event created successfully
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
 *     summary: Get all events
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     description: >
 *       Public endpoint. Guests can browse without a token.
 *       Non-admin visitors see published events.
 *       Admins can see all events.
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
 *         description: Number of events per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search event title, description, or location
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, cancelled, completed]
 *         description: Admin-only event status filter
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *       401:
 *         description: Invalid or expired token
 *       500:
 *         description: Server error
 *
 * /api/events/my-registrations:
 *   get:
 *     summary: Get my event registrations
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     description: Student only. Retrieves the logged-in student's registrations.
 *     responses:
 *       200:
 *         description: Registrations retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Student access required
 *       500:
 *         description: Server error
 *
 * /api/events/{id}:
 *   get:
 *     summary: Get event details
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     description: Public access to published events. Admins can view any event.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event retrieved successfully
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Invalid or expired token
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 *
 *   put:
 *     summary: Update an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               location:
 *                 type: string
 *                 nullable: true
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *               registration_deadline:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               capacity:
 *                 type: integer
 *                 nullable: true
 *               image_url:
 *                 type: string
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [draft, published, cancelled, completed]
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       400:
 *         description: Validation or database constraint error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 *
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     description: Admin only. Deleting an event also deletes its registrations through the database cascade.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 *
 * /api/events/{id}/register:
 *   post:
 *     summary: Register for an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     description: Student only. Checks event status, deadline, capacity, and existing registration.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       201:
 *         description: Event registration successful
 *       400:
 *         description: Registration is not available
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Student access required
 *       404:
 *         description: Event not found
 *       409:
 *         description: Already registered or event capacity reached
 *       500:
 *         description: Server error
 *
 * /api/events/{id}/cancel-registration:
 *   patch:
 *     summary: Cancel event registration
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     description: Student only. Cancels the logged-in student's active registration.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Registration cancelled successfully
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Student access required
 *       404:
 *         description: Active registration not found
 *       500:
 *         description: Server error
 */

// PUBLIC ROUTES
router.get("/", optionalAuthenticate, eventController.getAllEvents);

// Keep this route before /:id to avoid treating "my-registrations" as an ID.
router.get(
  "/my-registrations",
  authenticateToken,
  authorizeRoles("Student"),
  eventController.getMyRegistrations
);

router.get("/:id", optionalAuthenticate, eventController.getEventById);

// ADMIN ROUTES
router.post(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  eventController.createEvent
);

router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  eventController.updateEvent
);

router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("Admin"),
  eventController.deleteEvent
);

// STUDENT ROUTES
router.post(
  "/:id/register",
  authenticateToken,
  authorizeRoles("Student"),
  eventController.registerForEvent
);

router.patch(
  "/:id/cancel-registration",
  authenticateToken,
  authorizeRoles("Student"),
  eventController.cancelEventRegistration
);

module.exports = router;
