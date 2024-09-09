import express from "express";
import { db } from "../firebase.js";
import authenticateUser from "../middleware/authenticate-user.js";
import checkIsAdmin from "../middleware/check-is-admin.js";
const router = express.Router();

// @desc Route to get all jobs
// @route GET api/jobs/all
router.get("/all", async (req, res) => {
  try {
    const jobsRef = await db.collection("jobPostings").get();

    if (jobsRef.empty) {
      return res.status(404).json({ error: "Collection not found" });
    }

    const allJobs = jobsRef.docs.map((doc) => doc.data());

    return res.status(200).json(allJobs);
  } catch (error) {
    return res.status(500).json({ error: "Failed to retrieve user" });
  }
});

// @desc Route to get paginated jobs (next 10 documents)
// @route GET api/jobs
router.get("/", async (req, res) => {
  try {
    const { pageToken } = req.query; // `pageToken` will be the document ID of the last doc from previous page
    let jobsRef = db.collection("jobPostings").orderBy("createdAt").limit(10);

    // If there's a pageToken, start after the document with that ID
    if (pageToken) {
      const lastDocRef = await db
        .collection("jobPostings")
        .doc(pageToken)
        .get();
      jobsRef = jobsRef.startAfter(lastDocRef);
    }

    const snapshot = await jobsRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "No more jobs found" });
    }

    const jobs = snapshot.docs.map((doc) => ({
      id: doc.id, // Include the document ID for pagination
      ...doc.data(),
    }));

    // Get the last document in the snapshot for pagination
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    return res.status(200).json({
      jobs,
      nextPageToken: lastDoc.id, // Send the last document's ID as the next page token
    });
  } catch (error) {
    console.error("Error retrieving jobs:", error.message);
    return res.status(500).json({ error: "Failed to retrieve jobs" });
  }
});

// @desc test route
// @route POST api/jobs/test
router.post("/test", authenticateUser, checkIsAdmin, (req, res) => {
  res.status(200).json({ msg: "well done" });
});

export default router;
