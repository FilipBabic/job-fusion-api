import express from "express";
import firebase from "firebase-admin";
import { admin, db } from "../firebase.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

// @desc Register user route
// @route POST api/register

// array of avaliable user roles for registration
const roles = ["job_seekers", "recruiters"];

router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Invalid email address"),
    body("uid").isString().withMessage("UID must be a string"),
    body("role").isIn(roles).withMessage("Invalid role"),
  ],
  async (req, res) => {
    const { uid, email, role } = req.body;

    // Checking if there is an error in body validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessage = errors
        .array()
        .slice(0, 20)
        .map((error) => error.msg)
        .join(", ");
      return res.status(400).json({ error: errorMessage, status: "400" });
    }

    try {
      const userRef = db.collection(role).doc(uid);
      const doc = await userRef.get();
      // Checking if the user already exists
      if (doc.exists) {
        return res.status(400).json({ error: "User already exists", status: "400" });
      } else {
        // Set user to database
        await userRef.set({
          uid,
          email,
          role,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
      return res.status(201).send("User registered successfully");
    } catch (error) {
      return res.status(500).json({ error: "Error while registering user", status: "500" });
    }
  }
);

// @desc Login user route
// @route POST api/login
router.post("/login", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided or invalid format", status: "401" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);

    const { uid, email } = decodedToken;
    let role = null;

    // Checking which collection the user belongs to
    for (const userRole of ["job_seekers", "recruiters", "admins", "head_admins"]) {
      const userRef = db.collection(userRole).doc(uid);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        role = userRole;

        await userRef.update({
          lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        });
        break;
      }
    }
    if (!role) {
      return res.status(404).json({ error: "User role not found", status: "404" });
    }
    const cookieConfig = {
      httpOnly: true, // to disable accessing cookie via client side js
      //secure: true, // to force https (if you use it)
      maxAge: 1000000, // ttl in seconds (remove this option and cookie will die when browser is closed)
      // signed: true, // if you use the secret with cookieParser
    };
    res.cookie("ftoken", `${token}`, cookieConfig);
    return res.status(200).json({ uid, email, role });
  } catch (error) {
    return res.status(500).json({ error: "Invalid token", status: "500" });
  }
});

export default router;
