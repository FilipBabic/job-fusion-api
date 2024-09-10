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
        .slice(0, 20)
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

        return res.status(201).json({
          msg: `Organization ${name} created successfully`,
        });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Error while creating organization" });
    }
  }
);

// @desc Post a job to job_postings - route. Recruiter can create many jobs.
// @route POST api/recruiters/post-job
// @TODO: Change typeof start and expire date, from string to timestamp

router.post(
  "/post-job",
  authenticateUser,
  checkIsRecruiter,
  [
    body("title")
      .notEmpty()
      .withMessage("Job title is required")
      .isString()
      .withMessage("Job title must be a string"),
    body("location")
      .notEmpty()
      .withMessage("Job Location is required")
      .isString()
      .withMessage("Job location must be a string"),
    body("starts")
      .notEmpty()
      .withMessage("Job starting date is required")
      .isString()
      .withMessage("Job starting date must be a string"),
    body("expires")
      .notEmpty()
      .withMessage("Job expiring date is required")
      .isString()
      .withMessage("Job expiring date must be a string"),
    body("skills")
      .notEmpty()
      .withMessage("Skills field is required")
      .isArray()
      .withMessage("Skills must be an array"),
    // Validate the array length for job skills
    body("skills").custom((value) => {
      if (value.length <= 0 || value.length > 20) {
        throw new Error("Job skills cannot be empty or exceed 20 items");
      }
      return true;
    }),
    body("skills.*").isString().withMessage("Each skill must be a string"),
    body("jobDescriptions")
      .notEmpty()
      .withMessage("Job descriptions is required")
      .isArray()
      .withMessage("Job descriptions must be an array"),
    // Validate the array length for jobDescriptions
    body("jobDescriptions").custom((value) => {
      if (value.length <= 0 || value.length > 15) {
        throw new Error("Job descriptions cannot be empty or exceed 5 items");
      }
      return true;
    }),
    // Validate individual keys and values inside jobDescriptions array
    body("jobDescriptions.*.key")
      .notEmpty()
      .withMessage("Key is required for each description")
      .isString()
      .withMessage("Key must be a string"),
    body("jobDescriptions.*.value").custom((value) => {
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
  ],
  async (req, res) => {
    // Checking if there is an error in body validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessage = errors
        .array()
        .slice(0, 20)
        .map((error) => error.msg)
        .join(", ");
      return res.status(400).json({ error: errorMessage });
    }

    const {
      title,
      location,
      starts,
      expires,
      skills,
      jobDescriptions,
      salary,
      type,
    } = req.body;
    const recruiterId = req.user.uid;

    try {
      const recruiterRef = db.collection("recruiters").doc(recruiterId);
      const recruiterDoc = await recruiterRef.get();

      if (!recruiterDoc.exists) {
        return res.status(404).json({ error: "Recruiter not found" });
      }

      const recruiterData = recruiterDoc.data();

      if (!recruiterData || !recruiterData.organization) {
        return res.status(401).json({
          error: "Organization not found. Please create organization first",
        });
      }

      const organizationRef = recruiterData.organization;

      const jobPostingsRef = db.collection("job_postings").doc();
      await jobPostingsRef.set({
        title,
        location,
        starts,
        expires,
        skills,
        jobDescriptions,
        organization: organizationRef,
        recruiter: recruiterRef,
        salary: salary || "",
        type: type || "",
        applicants: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      await recruiterRef.update({
        postedJobs: firebase.firestore.FieldValue.arrayUnion(jobPostingsRef), // Add job reference to postedJobs array
      });

      return res
        .status(201)
        .json({ msg: "Job successfully posted to job_postings" });
    } catch (error) {
      return res.status(500).json({ error: "Error with posting job" });
    }
  }
);
export default router;
