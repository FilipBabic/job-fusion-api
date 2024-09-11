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
  check("address").optional().isString().withMessage("Address must be a string"),
  check("industry")
    .notEmpty()
    .withMessage("Industry is required")
    .isString()
    .withMessage("Industry must be a string"),
  check("type")
    .notEmpty()
    .withMessage("Organization type is required")
    .isString()
    .withMessage("Organization type must be a string"),
  check("email").optional().isEmail().withMessage("Email format not valid"),
  check("website")
    .optional()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Please provide a valid website URL (with http or https)."),
  check("logo").optional().isString().withMessage("Logo must be a string"),
];

export { validateOrganization };
