
const ALLOWED_AUDIENCES = ["all", "student", "staff", "guest"];

const ALLOWED_STATUSES = ["draft", "published", "archived"];

// Validate announcement ID
const validateAnnouncementId = (id) => {
  if (!/^[1-9]\d*$/.test(String(id))) {
    return "Invalid announcement ID";
  }

  return null;
};

// Validate date values
const isValidDate = (value) => {
  if (value === null || value === undefined || value === "") {
    return true;
  }

  return !Number.isNaN(Date.parse(value));
};

// Validate announcement data
const validateAnnouncement = (data, isUpdate = false) => {
  const errors = [];

  const { title, content, audience, status, published_at, expires_at } = data;

  // Required fields during creation
  if (!isUpdate) {
    if (!title || typeof title !== "string" || !title.trim()) {
      errors.push("Title is required");
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      errors.push("Content is required");
    }

    if (!audience) {
      errors.push("Audience is required");
    }

    if (!status) {
      errors.push("Status is required");
    }
  }

  // Validate optional fields when supplied
  if (title !== undefined) {
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 255
    ) {
      errors.push("Title must be between 1 and 255 characters");
    }
  }

  if (content !== undefined) {
    if (typeof content !== "string" || !content.trim()) {
      errors.push("Content cannot be empty");
    }
  }

  if (audience !== undefined) {
    if (!ALLOWED_AUDIENCES.includes(audience)) {
      errors.push(
        `Audience must be one of: ${ALLOWED_AUDIENCES.join(", ")}`
      );
    }
  }

  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status)) {
      errors.push(
        `Status must be one of: ${ALLOWED_STATUSES.join(", ")}`
      );
    }
  }

  if (published_at !== undefined && !isValidDate(published_at)) {
    errors.push("Invalid published_at date");
  }

  if (expires_at !== undefined && !isValidDate(expires_at)) {
    errors.push("Invalid expires_at date");
  }

  // Validate date relationship when both dates are provided
  if (
    published_at &&
    expires_at &&
    isValidDate(published_at) &&
    isValidDate(expires_at)
  ) {
    if (new Date(expires_at) < new Date(published_at)) {
      errors.push("Expiration date cannot be earlier than publication date");
    }
  }

  return errors;
};

module.exports = {
  ALLOWED_AUDIENCES,
  ALLOWED_STATUSES,
  validateAnnouncementId,
  validateAnnouncement,
};
