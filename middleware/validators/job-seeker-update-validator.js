import { check } from "express-validator";

// Validate job posting input
const validateJobSeekerUpdating = [
  check("name").optional().isString().withMessage("name must be a string"),
  check("profilePicture").optional().isString().withMessage("profilePicture must be a string"),
  check("resume").optional().isString().withMessage("resume must be a string"),
  check("skills").optional().isArray().withMessage("skills must be an array"),
  check("experience").optional().isArray().withMessage("experience must be an array"),
  check("education").optional().isArray().withMessage("education must be an array"),
];

export { validateJobSeekerUpdating };
