import express from "express";
import { db } from "../firebase.js";
import { generateETag } from "../utils/generate-etag.js";
import authenticateUser from "../middleware/auth/authenticate-user.js";
import checkIsAdmin from "../middleware/auth/check-is-admin.js";
const router = express.Router();

// @desc Route to get all jobs
// @route GET api/jobs/all
router.get("/all", async (req, res) => {
  try {
    const jobsRef = await db
      .collection("job_postings")
      .select(
        "title",
        "starts",
        "expires",
        "location",
        "organization",
        "organizationName",
        "organizationLogo",
        "type"
      )
      .get();

    if (jobsRef.empty) {
      return res.status(404).json({ error: "Job postings not found", status: "404" });
    }

    const allJobs = [];
    for (const jobDoc of jobsRef.docs) {
      const jobData = jobDoc.data();

      allJobs.push(jobData);
    }

    return res.status(200).json(allJobs);
  } catch (error) {
    return res.status(500).json({ error: "Failed to retrieve user", status: "500" });
  }
});

// @desc Route to get paginated jobs (next 10 documents)
// @route GET api/jobs
router.get("/", async (req, res) => {
  try {
    const { pageToken } = req.query; // `pageToken` will be the document ID of the last doc from previous page
    let jobsRef = db
      .collection("job_postings")
      .select(
        "title",
        "starts",
        "expires",
        "location",
        "organization",
        "organizationName",
        "organizationLogo",
        "type",
        "skills"
      )
      .orderBy("createdAt")
      .limit(4);

    // If there's a pageToken, start after the document with that ID
    if (pageToken) {
      const lastDocRef = await db.collection("job_postings").doc(pageToken).get();
      jobsRef = jobsRef.startAfter(lastDocRef);
    }

    const snapshot = await jobsRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "No more jobs found", status: "404" });
    }

    const jobs = snapshot.docs.map((doc) => ({
      id: doc.id, // Include the document ID for pagination
      ...doc.data(),
    }));

    const etag = generateETag(jobs);
    res.setHeader("ETag", etag);

    res.set({
      "Cache-Control": "public, max-age=30", // Cache for 30 seconds
      ETag: etag,
    });

    if (req.headers["if-none-match"] === etag) {
      console.log("Data has not change");
      return res.status(304).end("Data has not change");
    }

    // Get the last document in the snapshot for pagination
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    return res.status(200).json({
      jobs,
      nextPageToken: lastDoc.id, // Send the last document's ID as the next page token
    });
  } catch (error) {
    console.error("Error retrieving jobs:", error.message);
    return res.status(500).json({ error: "Failed to retrieve jobs", status: "500" });
  }
});

// @desc get job details route
// @route GET api/jobs/:id
router.get("/:id", async (req, res) => {
  const uid = req.params.id;
  try {
    const jobRef = db.collection("job_postings").doc(uid);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return res.status(404).json({ error: `Job with ID ${uid} not found`, status: "404" });
    }

    const jobData = jobDoc.data();

    delete jobData.organizationRef;
    delete jobData.recruiterRef;
    delete jobData.createdAt;
    delete jobData.updatedAt;
    const etag = generateETag(jobData);
    res.setHeader("ETag", etag);

    res.set({
      "Cache-Control": "public, max-age=60", // Cache for 60 seconds
      ETag: etag,
    });

    if (req.headers["if-none-match"] === etag) {
      console.log("Data job details has not change");
      return res.status(304).end("Data has not change");
    }

    return res.status(200).json(jobData);
  } catch (error) {
    return res.status(500).json({ error: "Error while fetching jobs", status: "500" });
  }
});

// @desc test route
// @route POST api/jobs/test
router.post("/test", authenticateUser, checkIsAdmin, (req, res) => {
  res.status(200).json({ msg: "well done" });
});

export default router;
