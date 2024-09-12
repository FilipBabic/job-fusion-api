import { check } from "express-validator";

// Validate job posting input
const validateJobUpdating = [
  check("title").optional().isString().withMessage("Job title must be a string"),
  check("location").optional().isString().withMessage("Job location must be a string"),
  check("starts").optional().isString().withMessage("Job starting date must be a string"),
  check("expires").optional().isString().withMessage("Job expiring date must be a string"),
  check("skills").optional().isArray().withMessage("Skills must be an array"),
  // Validate the array length for job skills
  check("skills")
    .optional()
    .custom((value) => {
      if (value.length <= 0 || value.length > 20) {
        throw new Error("Job skills cannot be empty or exceed 20 items");
      }
      return true;
    }),
  check("skills.*").optional().isString().withMessage("Each skill must be a string"),
  check("jobDescriptions").optional().isArray().withMessage("Job descriptions must be an array"),
  // Validate the array length for jobDescriptions
  check("jobDescriptions")
    .optional()
    .custom((value) => {
      if (value.length <= 0 || value.length > 15) {
        throw new Error("Job descriptions cannot be empty or exceed 5 items");
      }
      return true;
    }),
  // Validate individual keys and values inside jobDescriptions array
  check("jobDescriptions.*.key").optional().isString().withMessage("Key must be a string"),
  check("jobDescriptions.*.value")
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        // Check if all values in the array are strings
        const allStrings = value.every((item) => typeof item === "string");
        if (!allStrings) {
          throw new Error("All values in the array must be strings");
        }
      } else if (typeof value !== "string") {
        throw new Error("Value must be a string or an array of strings");
      }
      return true;
    }),
  check("type").optional().isString().withMessage("Job type must be a string"),
  check("salary").optional().isString().withMessage("Salary range must be a string"),
];

export { validateJobUpdating };
