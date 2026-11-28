const validateCategory = (req, res, next) => {
  const { category_name, description } = req.body;

  if (
    typeof category_name !== "string" ||
    category_name.trim().length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Category name is required.",
    });
  }

  if (category_name.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: "Category name must not exceed 100 characters.",
    });
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Description must be text.",
    });
  }

  next();
};

module.exports = { validateCategory };