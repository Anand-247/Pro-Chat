const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const { upload } = require("../config/cloudinary");

// @desc    Upload media file
// @route   POST /api/upload
// @access  Protected
router.post("/", authMiddleware, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  
  // Cloudinary returns the exact HTTPS URL in req.file.path
  res.status(200).json({ 
    url: req.file.path,
    filename: req.file.filename,
    type: req.file.mimetype,
  });
});

module.exports = router;
