import crypto from "crypto";
export const generateETag = (data) => {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
};
