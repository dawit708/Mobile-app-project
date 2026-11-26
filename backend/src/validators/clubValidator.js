
const ALLOWED_CLUB_STATUSES = ["active", "inactive"];

const validateClubId = (id) => {
  if (!/^[1-9]\d*$/.test(String(id))) {
    return "Invalid club ID";
  }

  return null;
};

const validateClub = (data, isUpdate = false) => {
  const errors = [];

  const {
    club_name,
    description,
    category,
    contact_email,
    image_url,
    status,
  } = data;

  if (!isUpdate) {
    if (
      typeof club_name !== "string" ||
      !club_name.trim()
    ) {
      errors.push("Club name is required");
    }
  }

  if (club_name !== undefined) {
    if (
      typeof club_name !== "string" ||
      !club_name.trim()
    ) {
      errors.push("Club name cannot be empty");
    }
  }

  for (const [field, value] of [
    ["description", description],
    ["category", category],
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

  if (
    contact_email !== undefined &&
    contact_email !== null &&
    contact_email !== ""
  ) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      typeof contact_email !== "string" ||
      !emailPattern.test(contact_email)
    ) {
      errors.push("Invalid contact email address");
    }
  }

  if (
    status !== undefined &&
    !ALLOWED_CLUB_STATUSES.includes(status)
  ) {
    errors.push(
      `Club status must be one of: ${ALLOWED_CLUB_STATUSES.join(", ")}`
    );
  }

  return errors;
};

const validateMembershipId = (id) => {
  if (!/^[1-9]\d*$/.test(String(id))) {
    return "Invalid membership ID";
  }

  return null;
};

module.exports = {
  ALLOWED_CLUB_STATUSES,
  validateClubId,
  validateClub,
  validateMembershipId,
};
