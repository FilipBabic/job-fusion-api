const checkIsRecruiter = (req, res, next) => {
  const userRole = req.user.role;

  if (userRole === "recruiters") {
    next();
  } else {
    return res.status(403).json({ error: "Access forbidden", status: "403" });
  }
};

export default checkIsRecruiter;
