import express from "express";
import firebase from "firebase-admin";
import { db } from "../firebase.js";
import { validateOrganization } from "../middleware/validators/organizationValidator.js";
import { validateOrganizationUpdate } from "../middleware/validators/organizationUpdateValidator.js";
import { validateJobPosting } from "../middleware/validators/jobPostingValidator.js";
import { validationResult } from "express-validator";
import authenticateUser from "../middleware/auth/authenticate-user.js";
import checkIsRecruiter from "../middleware/auth/check-is-recruiter.js";

const router = express.Router();

// @desc Create organization - route. Recruiter can create one organization only.
// @route POST api/recruiters/organization

router.post(
  "/organization",
  authenticateUser,
  checkIsRecruiter,
  validateOrganization,
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
    const { name, about, country, city, address, industry, type, email, website, logo } = req.body;

    try {
      const recruiterRef = db.collection("recruiters").doc(recruiterID);
      const recruiterDoc = await recruiterRef.get();

      if (!recruiterDoc.exists) {
        return res.status(404).json({ error: "Recruiter not found" });
      }

      const recruiterData = recruiterDoc.data();

      if (recruiterData && recruiterData.organization) {
        return res.status(403).json({ message: "Only one organization per user is allowed" });
      }
      const organizationRef = db.collection("organizations").doc();

      await organizationRef.set({
        name,
        about,
        country,
        city,
        address: address || "",
        industry,
        type,
        email: email || "",
        website: website || "",
        logo: logo || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Link recruiter document with a reference to the new organization
      await recruiterRef.update({
        organization: organizationRef,
      });

      return res.status(201).json({
        msg: `Organization ${name} created successfully`,
      });
    } catch (error) {
      return res.status(500).json({ error: "Error while creating organization" });
    }
  }
);

// @desc Update organization - route. Only recruiter can update his organization info.
// @route PATCH api/recruiters/organization

router.patch(
  "/organization",
  authenticateUser,
  checkIsRecruiter,
  validateOrganizationUpdate,
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
    const recruiterID = req.user.uid;
    const updates = req.body;
    // List of fields thet are allowed to update
    const allowedFields = [
      "name",
      "about",
      "country",
      "city",
      "address",
      "industry",
      "type",
      "email",
      "website",
      "logo",
    ];

    const filteredUpdates = Object.keys(updates)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: "No valid fields provided for update" });
    }
    try {
      const recruiterRef = db.collection("recruiters").doc(recruiterID);
      const recruiterDoc = await recruiterRef.get();

      if (!recruiterDoc.exists) {
        return res.status(404).json({ error: "Recruiter not found" });
      }
      const recruiterData = recruiterDoc.data();

      if (!recruiterData.organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const organizationRef = recruiterData.organization;
      filteredUpdates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

      await organizationRef.update(filteredUpdates);
      res.status(200).json({ msg: "Organization updated successffully" });
    } catch (error) {
      res.status(500).json({ error: "Error updating organization" });
    }
  }
);

// @desc Post a job - route. Recruiter can create many jobs for his organization.
// @route POST api/recruiters/post-job
// @TODO: Change typeof starts and expires date, from string to timestamp

router.post(
  "/post-job",
  authenticateUser,
  checkIsRecruiter,
  validateJobPosting,
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

    const { title, location, starts, expires, skills, jobDescriptions, salary, type } = req.body;
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
      const organizationDoc = await organizationRef.get();
      const organizationData = organizationDoc.data();

      if (!organizationData || !organizationData.name) {
        return res.status(401).json({ error: "Organization data not found" });
      }

      const jobRef = db.collection("job_postings").doc();
      await jobRef.set({
        title,
        location,
        starts,
        expires,
        skills,
        jobDescriptions,
        applicants: [],
        type: type || "",
        salary: salary || "",
        organizationName: organizationData.name,
        organizationLogo: organizationData.logo || "no_logo.png",
        organizationRef: organizationRef,
        recruiterRef: recruiterRef,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      await recruiterRef.update({
        postedJobs: firebase.firestore.FieldValue.arrayUnion(jobRef), // Add job reference to postedJobs array
      });

      return res.status(201).json({ msg: "Job successfully posted to job_postings" });
    } catch (error) {
      return res.status(500).json({ error: "Error with posting job" });
    }
  }
);
export default router;
