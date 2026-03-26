const { Op } = require("sequelize");
const User = require("../models/user.model");

// @desc    Get all users (with optional search query)
// @route   GET /api/user?search=...
// @access  Protected
exports.allUsers = async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
          [Op.or]: [
            { name: { [Op.iLike]: `%${req.query.search}%` } },
            { email: { [Op.iLike]: `%${req.query.search}%` } },
          ],
        }
      : {};

    const users = await User.findAll({
      where: {
        ...keyword,
        id: { [Op.ne]: req.user.id }, // Exclude current user
      },
      attributes: ['id', 'name', 'email', 'avatar', 'bio'], // Important: omit password
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Protected
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.body.name) user.name = req.body.name;
    if (req.body.bio) user.bio = req.body.bio;
    if (req.body.avatar) user.avatar = req.body.avatar;

    await user.save();

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
};
