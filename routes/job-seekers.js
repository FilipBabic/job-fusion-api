import express from "express";
import firebase from "firebase-admin";
import { db } from "../firebase.js";
import authenticateUser from "../middleware/auth/authenticate-user.js";
import checkIsJobSeeker from "../middleware/auth/check-is-job-seeker.js";
import { validateJobSeekerUpdating } from "../middleware/validators/job-seeker-update-validator.js";
import { validationResult } from "express-validator";

const router = express.Router();

// @desc Get job seeker profile.
// requiredFields = ["email", "role", "createdAt", "lastLogin", "uid"];
// optionalFields = ["name","profilePicture","resume","skills","experience","education","appliedJobs"];
// @route GET api/job-seekers/profile
router.get("/test", authenticateUser, (req, res) => {
  res.send("Successfully send cookie");
});
router.get("/profile", authenticateUser, checkIsJobSeeker, (req, res) => {
  const user = req.user;
  try {
    // List of required fields
    const requiredFields = ["email", "role", "createdAt", "lastLogin", "uid"];

    // Check if any required fields are missing
    for (const field of requiredFields) {
      if (!user[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // Required fields
    const profile = {
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      id: user.uid,
    };

    // Add optional fields if they exist
    const optionalFields = [
      "name",
      "profilePicture",
      "resume",
      "skills",
      "experience",
      "education",
      "appliedJobs",
    ];

    optionalFields.forEach((field) => {
      if (user[field]) {
        profile[field] = user[field];
      }
    });

    return res.status(200).json(profile);
  } catch (error) {
    return res.status(500).json({ error: "Error fetching job seeker profile" });
  }
});

// @desc Update job seeker profile.
// allowedFields = ["name", "profilePicture", "resume", "skills", "experience", "education"]
// @route PATCH api/job-seekers/profile

router.patch(
  "/profile",
  authenticateUser,
  checkIsJobSeeker,
  validateJobSeekerUpdating,
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

    const jobSeekerID = req.user.uid;
    const updates = req.body;

    const allowedFields = ["name", "profilePicture", "resume", "skills", "experience", "education"];

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
      const jobSeekerRef = db.collection("job_seekers").doc(jobSeekerID);
      const jobSeekerDoc = await jobSeekerRef.get();

      if (!jobSeekerDoc.exists) {
        return res.status(404).json({ error: "Job seeker doc not found" });
      }

      filteredUpdates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await jobSeekerRef.update(filteredUpdates);

      return res
        .status(200)
        .json({ msg: `Job Seeker with id ${jobSeekerID} updated successfully` });
    } catch (error) {
      res.status(500).json({ error: "Error while updating job seeker profile" });
    }
  }
);
export default router;
