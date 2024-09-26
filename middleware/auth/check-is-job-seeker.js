const checkIsJobSeeker = (req, res, next) => {
  const userRole = req.user.role;

  if (userRole === "job_seekers") {
    next();
  } else {
    return res.status(403).json({ error: "Access forbidden", status: "403" });
  }
};

export default checkIsJobSeeker;
