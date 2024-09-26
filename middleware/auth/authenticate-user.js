import { admin, db } from "../../firebase.js";

// @desc Middleware to authenticate user using Firebase token
const authenticateUser = async (req, res, next) => {
  const token = req.cookies.ftoken;

  try {
    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    let userDoc;

    // Checking which collection the user belongs to
    for (const userRole of ["job_seekers", "recruiters", "admins", "head_admins"]) {
      const userRef = db.collection(userRole).doc(decodedToken.uid);
      userDoc = await userRef.get();

      if (userDoc.exists) {
        req.user = userDoc.data(); // Attach user data to the request
        break;
      }
    }
    if (!userDoc) {
      return res.status(404).json({ error: "User doesn't exists", status: "404" });
    }
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid Token", status: "403" });
  }
};

export default authenticateUser;
