import express from "express";
import { db } from "../firebase.js";
import { generateETag } from "../utils/generate-etag.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const organizationRef = await db.collection("organizations").get();

    if (organizationRef.empty) {
      return res.status(404).json({ error: "organization not found" });
    }
    let id = 0;
    const allOrganizations = [];
    for (const orgDoc of organizationRef.docs) {
      const orgData = orgDoc.data();
      orgData.id = id;
      id++;
      delete orgData.updatedAt;
      delete orgData.createdAt;

      allOrganizations.push(orgData);
    }

    const etag = generateETag(allOrganizations);
    res.setHeader("ETag", etag);

    res.set({
      "Cache-Control": "public, max-age=30", // Cache for 30 seconds
      ETag: etag,
    });

    if (req.headers["if-none-match"] === etag) {
      console.log("ORGANIZATIONS Data has not change ");
      return res.status(304).end("Data has not change");
    }

    return res.status(200).json(allOrganizations);
  } catch (error) {
    return res.status(500).json({ error: "Failed to retrieve ORGANIZATION" });
  }
});

export default router;
