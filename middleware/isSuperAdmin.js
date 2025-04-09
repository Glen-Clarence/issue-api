const User = require("../models/User");

const isSuperAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isSuperAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Super admin privileges required." });
    }
    next();
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error checking admin privileges",
        error: error.message,
      });
  }
};

module.exports = isSuperAdmin;
