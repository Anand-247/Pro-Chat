const { Op } = require("sequelize");
const { User, PushToken } = require("../models");

// @desc    Get all users (with optional search query)
// @route   GET /api/user?search=...
// @access  Protected
exports.allUsers = async (req, res) => {
  try {
    const search = req.query.search;
    const keyword = search
      ? {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
            { phone: { [Op.iLike]: `%${search}%` } },
            { displayName: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    const users = await User.findAll({
      where: {
        ...keyword,
        id: { [Op.ne]: req.user.id }, // Exclude current user
      },
      attributes: ['id', 'name', 'displayName', 'email', 'phone', 'avatar', 'about', 'isOnline', 'lastSeenAt'],
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
    if (req.body.displayName) user.displayName = req.body.displayName;
    if (req.body.about) user.about = req.body.about;
    if (req.body.avatar) user.avatar = req.body.avatar;
    if (req.body.phone) user.phone = req.body.phone;

    await user.save();

    res.json({
      id: user.id,
      name: user.name,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      about: user.about
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
};

// @desc    Register or update push token
// @route   POST /api/user/push-token
// @access  Protected
exports.registerPushToken = async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token || !platform) {
      return res.status(400).json({ message: "Token and platform are required" });
    }

    // UPSERT: Find existing or create new
    const [pushToken, created] = await PushToken.findOrCreate({
      where: { token },
      defaults: { userId: req.user.id, platform, lastUsedAt: new Date() }
    });

    if (!created) {
      pushToken.userId = req.user.id;
      pushToken.platform = platform;
      pushToken.lastUsedAt = new Date();
      await pushToken.save();
    }

    res.status(200).json({ message: "Token registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to register push token", error: error.message });
  }
};
