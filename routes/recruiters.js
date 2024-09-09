import express from "express";
import firebase from "firebase-admin";
import { db } from "../firebase.js";
import { body, validationResult } from "express-validator";
import authenticateUser from "../middleware/authenticate-user.js";
import checkIsRecruiter from "../middleware/check-is-recruiter.js";

const router = express.Router();

// @desc Create or update organization route. Recruiter can create one organization only.
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

      const recruiterData = recruiterDoc.data();

      let organizationRef;

      if (recruiterData && recruiterData.organization) {
        // If recruiter already has the organization, update it
        organizationRef = recruiterData.organization;
        // Fetch existing company data

        const organizationDoc = await organizationRef.get();
        const existingData = organizationDoc.data();

        // Create an update object with only changed properties
        const updateData = {};
        if (name && name !== existingData.name) updateData.name = name;
        if (location && location !== existingData.location)
          updateData.location = location;
        if (industry && industry !== existingData.industry)
          updateData.industry = industry;
        if (
          description !== undefined &&
          description !== existingData.description
        )
          updateData.description = description;
        if (website !== undefined && website !== existingData.website)
          updateData.website = website;
        if (logo !== undefined && logo !== existingData.logo)
          updateData.logo = logo;

        if (Object.keys(updateData).length === 0) {
          return res.status(400).json({ error: "No fields to update." });
        }

        // Update the organization document
        await organizationRef.update({
          ...updateData,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        return res
          .status(200)
          .json({ message: `Organization ${name} updated successfully` });
      } else {
        // If recruiter does not have the organization, create a new one
        organizationRef = db.collection("organizations").doc();

        await organizationRef.set({
          name,
          location,
          industry,
          description: description || "",
          website: website || "",
          logo: logo || "",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        // Link recruiter document with a reference to the new company
        await recruiterRef.update({
          organization: organizationRef,
        });

        res.status(201).json({
          msg: `Organization ${name} created successfully`,
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Error while creating organization" });
    }
  }
);
export default router;
