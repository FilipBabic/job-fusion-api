import { check } from "express-validator";

// Validate update organization input
const validateOrganizationUpdate = [
  check("name").optional().isString().withMessage("Name must be a string"),
  check("about").optional().isString().withMessage("About must be a string"),
  check("country").optional().isString().withMessage("Country must be a string"),
  check("city").optional().isString().withMessage("City must be a string"),
  check("address").optional().isString().withMessage("Address must be a string"),
  check("industry").optional().isString().withMessage("Industry must be a string"),
  check("type").optional().isString().withMessage("Organization type must be a string"),
  check("email").optional().isEmail().withMessage("Email format not valid"),
  check("website")
    .optional()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("Please provide a valid website URL (with http or https)."),
  check("logo").optional().isString().withMessage("Logo must be a string"),
];

export { validateOrganizationUpdate };
