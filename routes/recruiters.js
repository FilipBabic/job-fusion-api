import express from "express";
import { db } from "../firebase.js";
import { body, validationResult } from "express-validator";
import authenticateUser from "../middleware/authenticate-user.js";
import checkIsRecruiter from "../middleware/check-is-recruiter.js";

const router = express.Router();

// @desc Create organization route. Recruiter can create one organization only.
// @route POST api/recruiters/organization
router.post(
  "/organization",
  authenticateUser,
  checkIsRecruiter,
  [
    body("name")
      .notEmpty()
      .withMessage("Company name is required")
      .isString()
      .withMessage("Company name must be a string"),
    body("location")
      .notEmpty()
      .withMessage("Location is required")
      .isString()
      .withMessage("Company location must be a string"),
    body("industry")
      .notEmpty()
      .withMessage("Industry is required")
      .isString()
      .withMessage("Company industry must be a string"),
  ],
  async (req, res) => {
    // Checking if there is an error in body validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessage = errors
        .array()
        .map((error) => error.msg)
        .join(", ");
      return res.status(400).json({ error: errorMessage });
    }
    // Get user id from authentificate middleware
    const recruiterID = req.user.uid;
    const { name, location, industry, description, website, logo } = req.body;
    try {
      const recruiterRef = db.collection("recruiters").doc(recruiterID);
      const recruiterDoc = await recruiterRef.get();

      if (!recruiterDoc.exists) {
        return res.status(404).json({ error: "Recruiter not found" });
      }
      // Check if user already created organization
      const recruiterData = recruiterDoc.data();
      if (recruiterData.organization) {
        return res
          .status(403)
          .json({ error: "You can only create one company per profile" });
      }

      // Create a new organization document
      const organizationRef = db.collection("organizations").doc();
      await organizationRef.set({
        name,
        location,
        industry,
        description: description || null,
        website: website || null,
        logo: logo || null,
      });

      // Link the organization to the recruiter
      await recruiterRef.update({
        organization: organizationRef,
      });
      res.status(201).json({
        msg: `Organization ${name} successfully created`,
      });
    } catch (error) {
      res.status(500).json({ error: "Error while creating company" });
    }
  }
);
export default router;
