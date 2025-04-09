const isSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Superadmin only." });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Error checking permissions" });
  }
};

module.exports = { isSuperAdmin };
