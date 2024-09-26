const errorHandler = (err, req, res, next) => {
  if (err.status) {
    res.status(err.status).json({ error: err.message, status: `${err.status}` });
  } else {
    res.status(500).json({ error: err.message, status: "500" });
  }
};

export default errorHandler;
