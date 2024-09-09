const checkIsRecruiter = (req, res, next) => {
  const userRole = req.user.role;

  if (userRole === "recruiters") {
    next();
  } else {
    return res.status(403).json({ error: "Access forbidden" });
  }
};

export default checkIsRecruiter;
