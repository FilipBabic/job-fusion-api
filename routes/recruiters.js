import express from "express";
import firebase from "firebase-admin";
import { db } from "../firebase.js";
import { validateOrganization } from "../middleware/validators/organization-validator.js";
import { validateOrganizationUpdate } from "../middleware/validators/organization-update-validator.js";
import { validateJobPosting } from "../middleware/validators/job-posting-validator.js";
import { validateJobUpdating } from "../middleware/validators/job-update-validator.js";
import { validationResult } from "express-validator";
import authenticateUser from "../middleware/auth/authenticate-user.js";
import checkIsRecruiter from "../middleware/auth/check-is-recruiter.js";

const router = express.Router();

// @desc Fetch organization for recruiter - route.
// @route GET api/recruiters/organization

router.get("/organization", authenticateUser, checkIsRecruiter, async (req, res) => {
  const recruiterID = req.user.uid;
  try {
    const recruiterRef = db.collection("recruiters").doc(recruiterID);
    const recruiterDoc = await recruiterRef.get();

    if (!recruiterDoc.exists) {
      return res.status(404).json({ error: "Recruiter not found" });
    }

    const organizationRef = recruiterDoc.data().organization;

    if (!organizationRef) {
      return res.status(404).json({ message: "Organization not found" });
    }
    const organizationDoc = await organizationRef.get();

    if (!organizationDoc.exists) {
      return res.status(404).json({ message: "Organization doc not found" });
    }
    const organizationData = organizationDoc.data();

    res.status(200).json(organizationData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch organization" });
  }
});

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
      return res.status(500).json({ error: "Failed to create organization" });
    }
  }
);

// @desc Update organization - route. Only logged recruiter can update his organization info.
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
      res.status(500).json({ error: "Failed to update organization" });
    }
  }
);

// @desc Delete organization and recruiter reference - route. Only logged recruiter can delete his organization.
// @route DELETE api/recruiters/organization
// TODO add deleting recruiter jobs after deleting organization or remove this route

router.delete("/organization", authenticateUser, checkIsRecruiter, async (req, res) => {
  const recruiterID = req.user.uid;
  try {
    const recruiterRef = db.collection("recruiters").doc(recruiterID);
    const recruiterDoc = await recruiterRef.get();

    if (!recruiterDoc.exists) {
      return res.status(404).json({ error: "Recruiter not found" });
    }

    const organizationRef = recruiterDoc.data().organization;

    if (!organizationRef) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const organizationDoc = await organizationRef.get();

    if (!organizationDoc) {
      return res.status(404).json({ message: "Organization doc not found" });
    }

    await organizationRef.delete();
    await recruiterRef.update({ organization: firebase.firestore.FieldValue.delete() });
    return res.status(200).json({ msg: "Organization successfully deleted" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete organization" });
  }
});

// @desc Post a job - route. Recruiter can create many jobs for his organization.
// @route POST api/recruiters/post-job
// @TODO: Change typeof starts and expires date, from string to timestamp

router.post("/job", authenticateUser, checkIsRecruiter, validateJobPosting, async (req, res) => {
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
  const recruiterID = req.user.uid;

  try {
    const recruiterRef = db.collection("recruiters").doc(recruiterID);
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

    return res.status(201).json({ msg: "Job created successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to post a job" });
  }
});

// @desc Update a job - route. Recruiter can only upgrade jobs that he has published
// @route PATCH api/recruiters/update-job/:id
// @TODO: fix validation for array of jobDescriptions

router.patch(
  "/job/:id",
  authenticateUser,
  checkIsRecruiter,
  validateJobUpdating,
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
    const { id } = req.params;
    const updates = req.body;
    const { postedJobs } = req.user;

    const allowedFields = [
      "title",
      "location",
      "starts",
      "expires",
      "skills",
      "jobDescriptions",
      "type",
      "salary",
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
      // Get reference to the job that the recruiter wants to update
      const jobRef = db.collection("job_postings").doc(id);

      // Check if the jobRef exists in the recruiter's postedJobs (array of references)
      const jobOwnedByRecruiter = postedJobs.some(
        (postedJobRef) => postedJobRef.path === jobRef.path
      );

      // If the job is not owned by the recruiter, deny access
      if (!jobOwnedByRecruiter) {
        return res.status(403).json({
          error: "You are not authorized to update this job.",
        });
      }

      // Update the job in the 'job_postings' collection
      await jobRef.update({
        ...filteredUpdates,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ msg: "Job updated successfully" });
    } catch (error) {
      return res.status(500).json({ error: "Failed to update job" });
    }
  }
);

// @desc Get a jobs for logged recruiter - route. Recruiter can have many jobs for his organization.
// @route GET api/recruiters/jobs

router.get("/jobs", authenticateUser, checkIsRecruiter, async (req, res) => {
  const recruiterID = req.user.uid;

  try {
    const recruiterRef = db.collection("recruiters").doc(recruiterID);
    const recruiterDoc = await recruiterRef.get();

    if (!recruiterDoc.exists) {
      return res.status(404).json({ error: " Recruiter not found" });
    }

    const recruiterData = recruiterDoc.data();

    if (!recruiterData.postedJobs || recruiterData.postedJobs.length === 0) {
      return res.status(404).json({ message: "No job postings found for this recruiter" });
    }

    // Fetch job details for each job posting reference
    const jobPostings = [];
    for (const jobRef of recruiterData.postedJobs) {
      const jobDoc = await jobRef.get();
      if (jobDoc.exists) {
        jobPostings.push({
          id: jobDoc.id,
          ...jobDoc.data(),
        });
      }
    }

    return res.status(200).json(jobPostings);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// @desc Delete a job for logged recruiter - route. Recruiter can delete one jobs per call.
// @route DELETE api/recruiters/job/:id
// TODO Add validation if the recruiter has no posted jobs

router.delete("/job/:id", authenticateUser, checkIsRecruiter, async (req, res) => {
  const { id } = req.params;
  const recruiterID = req.user.uid;
  const { postedJobs } = req.user;

  try {
    // Get reference to the job that the recruiter wants to update
    const jobRef = db.collection("job_postings").doc(id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return res.status(404).json({ error: " Job not found" });
    }
    // Check if the jobRef exists in the recruiter's postedJobs (array of references)
    const jobOwnedByRecruiter = postedJobs.some(
      (postedJobRef) => postedJobRef.path === jobRef.path
    );

    // If the job is not owned by the recruiter, deny access
    if (!jobOwnedByRecruiter) {
      return res.status(403).json({
        error: "You are not authorized to delete this job.",
      });
    }

    // Get the recruiter document reference
    const recruiterRef = db.collection("recruiters").doc(recruiterID);

    // Update the recruiter document by removing the job reference from the postedJobs array
    await recruiterRef.update({
      postedJobs: firebase.firestore.FieldValue.arrayRemove(jobRef), // Remove the job reference from the array
    });

    await jobRef.delete();

    return res.status(200).json({ msg: "Successfully deleted job posting" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete job posting" });
  }
});
export default router;
