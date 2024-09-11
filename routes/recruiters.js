import express from "express";
import firebase from "firebase-admin";
import { db } from "../firebase.js";
import {
  validateOrganization,
  validateJobPosting,
} from "../middleware/validator.js";
import { validationResult } from "express-validator";
import authenticateUser from "../middleware/authenticate-user.js";
import checkIsRecruiter from "../middleware/check-is-recruiter.js";

const router = express.Router();

// @desc Create or update organization route. Recruiter can create one organization only.
// @route POST api/recruiters/organization
// TODO add organization type prop
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
    const {
      name,
      about,
      country,
      city,
      address,
      industry,
      email,
      website,
      logo,
    } = req.body;

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
        // Fetch existing organization data

        const organizationDoc = await organizationRef.get();
        const existingData = organizationDoc.data();

        // Create an update object with only changed properties
        const updateData = {};
        if (name && name !== existingData.name) updateData.name = name;
        if (country && country !== existingData.country)
          updateData.country = country;
        if (city && city !== existingData.city) updateData.city = city;
        if (address && address !== existingData.address)
          updateData.address = address;
        if (industry && industry !== existingData.industry)
          updateData.industry = industry;
        if (about && about !== existingData.about) updateData.about = about;
        if (email !== undefined && email !== existingData.email)
          updateData.email = email;
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
          country,
          city,
          address,
          industry,
          about,
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

      return res
        .status(201)
        .json({ msg: "Job successfully posted to job_postings" });
    } catch (error) {
      return res.status(500).json({ error: "Error with posting job" });
    }
  }
);
export default router;
