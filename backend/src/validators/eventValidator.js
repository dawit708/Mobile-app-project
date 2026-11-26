
const ALLOWED_EVENT_STATUSES = [
  "draft",
  "published",
  "cancelled",
  "completed",
];

const validateEventId = (id) => {
  if (!/^[1-9]\d*$/.test(String(id))) {
    return "Invalid event ID";
  }

  return null;
};

const isValidDate = (value) => {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
};

const validateEvent = (data, isUpdate = false) => {
  const errors = [];

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
  } = data;

  // Required fields during event creation
  if (!isUpdate) {
    if (!title || typeof title !== "string" || !title.trim()) {
      errors.push("Event title is required");
    }

    if (!isValidDate(start_date)) {
      errors.push("A valid start_date is required");
    }

    if (!isValidDate(end_date)) {
      errors.push("A valid end_date is required");
    }

    if (!status) {
      errors.push("Event status is required");
    }
  }

  // Validate title
  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      errors.push("Event title cannot be empty");
    }
  }

  // Validate optional text fields
  for (const [field, value] of [
    ["description", description],
    ["location", location],
    ["image_url", image_url],
  ]) {
    if (
      value !== undefined &&
      value !== null &&
      typeof value !== "string"
    ) {
      errors.push(`${field} must be a string or null`);
    }
  }

  // Validate dates
  if (start_date !== undefined && !isValidDate(start_date)) {
    errors.push("Invalid start_date");
  }

  if (end_date !== undefined && !isValidDate(end_date)) {
    errors.push("Invalid end_date");
  }

  if (
    registration_deadline !== undefined &&
    registration_deadline !== null &&
    !isValidDate(registration_deadline)
  ) {
    errors.push("Invalid registration_deadline");
  }

  // Validate date relationship when both are provided
  if (
    isValidDate(start_date) &&
    isValidDate(end_date) &&
    new Date(end_date) < new Date(start_date)
  ) {
    errors.push("Event end date cannot be earlier than start date");
  }

  // Validate capacity
  if (capacity !== undefined && capacity !== null) {
    if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) {
      errors.push("Capacity must be a positive integer or null");
    }
  }

  // Validate event status
  if (status !== undefined) {
    if (!ALLOWED_EVENT_STATUSES.includes(status)) {
      errors.push(
        `Status must be one of: ${ALLOWED_EVENT_STATUSES.join(", ")}`
      );
    }
  }

  return errors;
};

module.exports = {
  ALLOWED_EVENT_STATUSES,
  validateEventId,
  validateEvent,
};
