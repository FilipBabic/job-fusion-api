const checkIsAdmin = (req, res, next) => {
  const userRole = req.user.role;

  if (userRole === "admins") {
    next();
  } else {
    return res.status(403).json({ error: "Access forbidden" });
  }
};

export default checkIsAdmin;
