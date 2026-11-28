
const ALLOWED_FACILITY_STATUSES = ["active", "inactive"];

const validateFacilityId = (id) => {
  if (!/^[1-9]\d*$/.test(String(id))) {
    return "Invalid facility ID";
  }

  return null;
};

const validateFacility = (data, isUpdate = false) => {
  const errors = [];

  const allowedFields = [
    "facility_name",
    "description",
    "category",
    "building_name",
    "location_description",
    "latitude",
    "longitude",
    "contact_number",
    "opening_hours",
    "image_url",
    "status",
  ];

  if (isUpdate) {
    const suppliedFields = Object.keys(data);

    if (!suppliedFields.length) {
      errors.push("Provide at least one field to update");
    }

    const invalidFields = suppliedFields.filter(
      (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length) {
      errors.push(
        `Unsupported fields: ${invalidFields.join(", ")}`
      );
    }
  }

  if (!isUpdate) {
    if (
      typeof data.facility_name !== "string" ||
      !data.facility_name.trim()
    ) {
      errors.push("Facility name is required");
    }
  }

  if (data.facility_name !== undefined) {
    if (
      typeof data.facility_name !== "string" ||
      !data.facility_name.trim()
    ) {
      errors.push("Facility name cannot be empty");
    } else if (data.facility_name.trim().length > 150) {
      errors.push("Facility name cannot exceed 150 characters");
    }
  }

  const stringFields = [
    "description",
    "category",
    "building_name",
    "location_description",
    "contact_number",
    "opening_hours",
    "image_url",
  ];

  for (const field of stringFields) {
    const value = data[field];

    if (
      value !== undefined &&
      value !== null &&
      typeof value !== "string"
    ) {
      errors.push(`${field} must be a string or null`);
    }
  }

  if (
    data.category &&
    data.category.length > 100
  ) {
    errors.push("Category cannot exceed 100 characters");
  }

  if (
    data.building_name &&
    data.building_name.length > 150
  ) {
    errors.push("Building name cannot exceed 150 characters");
  }

  if (
    data.latitude !== undefined &&
    data.latitude !== null &&
    (
      typeof data.latitude !== "number" ||
      !Number.isFinite(data.latitude) ||
      data.latitude < -90 ||
      data.latitude > 90
    )
  ) {
    errors.push("Latitude must be a number between -90 and 90");
  }

  if (
    data.longitude !== undefined &&
    data.longitude !== null &&
    (
      typeof data.longitude !== "number" ||
      !Number.isFinite(data.longitude) ||
      data.longitude < -180 ||
      data.longitude > 180
    )
  ) {
    errors.push("Longitude must be a number between -180 and 180");
  }

  // Coordinates must be provided together.
  if (
    (data.latitude === null && data.longitude !== null) ||
    (data.longitude === null && data.latitude !== null)
  ) {
    errors.push("Latitude and longitude must both be provided or both be null");
  }

  if (
    (data.latitude !== undefined && data.latitude !== null) &&
    (data.longitude === undefined || data.longitude === null)
  ) {
    errors.push("Longitude is required when latitude is provided");
  }

  if (
    (data.longitude !== undefined && data.longitude !== null) &&
    (data.latitude === undefined || data.latitude === null)
  ) {
    errors.push("Latitude is required when longitude is provided");
  }

  if (
    data.status !== undefined &&
    !ALLOWED_FACILITY_STATUSES.includes(data.status)
  ) {
    errors.push(
      `Status must be one of: ${ALLOWED_FACILITY_STATUSES.join(", ")}`
    );
  }

  return errors;
};

module.exports = {
  ALLOWED_FACILITY_STATUSES,
  validateFacilityId,
  validateFacility,
};
