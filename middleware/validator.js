import { check } from "express-validator";

// Validate organization input

const validateOrganization = [
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),
  check("about")
    .notEmpty()
    .withMessage("About is required")
    .isString()
    .withMessage("About must be a string"),
  check("country")
    .notEmpty()
    .withMessage("Country is required")
    .isString()
    .withMessage("Country must be a string"),
  check("city")
    .notEmpty()
    .withMessage("City is required")
    .isString()
    .withMessage("City must be a string"),
  check("address")
    .notEmpty()
    .withMessage("Address is required")
    .isString()
    .withMessage("Address must be a string"),
  check("industry")
    .notEmpty()
    .withMessage("Industry is required")
    .isString()
    .withMessage("Industry must be a string"),
];

// Validate job posting input

const validateJobPosting = [
  check("title")
    .notEmpty()
    .withMessage("Job title is required")
    .isString()
    .withMessage("Job title must be a string"),
  check("location")
    .notEmpty()
    .withMessage("Job Location is required")
    .isString()
    .withMessage("Job location must be a string"),
  check("starts")
    .notEmpty()
    .withMessage("Job starting date is required")
    .isString()
    .withMessage("Job starting date must be a string"),
  check("expires")
    .notEmpty()
    .withMessage("Job expiring date is required")
    .isString()
    .withMessage("Job expiring date must be a string"),
  check("skills")
    .notEmpty()
    .withMessage("Skills field is required")
    .isArray()
    .withMessage("Skills must be an array"),
  // Validate the array length for job skills
  check("skills").custom((value) => {
    if (value.length <= 0 || value.length > 20) {
      throw new Error("Job skills cannot be empty or exceed 20 items");
    }
    return true;
  }),
  check("skills.*").isString().withMessage("Each skill must be a string"),
  check("jobDescriptions")
    .notEmpty()
    .withMessage("Job descriptions is required")
    .isArray()
    .withMessage("Job descriptions must be an array"),
  // Validate the array length for jobDescriptions
  check("jobDescriptions").custom((value) => {
    if (value.length <= 0 || value.length > 15) {
      throw new Error("Job descriptions cannot be empty or exceed 5 items");
    }
    return true;
  }),
  // Validate individual keys and values inside jobDescriptions array
  check("jobDescriptions.*.key")
    .notEmpty()
    .withMessage("Key is required for each description")
    .isString()
    .withMessage("Key must be a string"),
  check("jobDescriptions.*.value").custom((value) => {
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
  check("type").isString().withMessage("Job type must be a string"),
  check("salary").isString().withMessage("Salary range must be a string"),
];
export { validateOrganization, validateJobPosting };
