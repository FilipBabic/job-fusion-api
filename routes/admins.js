import express from "express";
import { db } from "../firebase.js";
import authenticateUser from "../middleware/auth/authenticate-user.js";
import checkIsAdmin from "../middleware/auth/check-is-admin.js";

const router = express.Router();

// @desc admins delete job postings
// @route DELETE api/admins/:id
router.delete("/:id", authenticateUser, checkIsAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const jobSeekerRef = db.collection("jobPostings").doc(id);
    const jobSeekerDoc = await jobSeekerRef.get();

    if (!jobSeekerDoc.exists) {
      return res.status(404).json({ error: "Job posting not found", status: "404" });
    }

    await jobSeekerRef.delete();
    res.status(200).json({ msg: "Job posting deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting job posting", status: "500" });
  }
});

export default router;
