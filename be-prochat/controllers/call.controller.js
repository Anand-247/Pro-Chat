const { Call, User } = require("../models");
const { Op } = require("sequelize");

// @desc    Get user's call history
// @route   GET /api/call
// @access  Protected
exports.getCallHistory = async (req, res) => {
  try {
    const history = await Call.findAll({
      where: {
        [Op.or]: [
          { callerId: req.user.id },
          { receiverId: req.user.id }
        ]
      },
      include: [
        {
          model: User,
          as: "caller",
          attributes: ["id", "name", "avatar", "email"]
        },
        {
          model: User,
          as: "receiver",
          attributes: ["id", "name", "avatar", "email"]
        }
      ],
      order: [["createdAt", "DESC"]],
      limit: 50
    });

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch call history", error: error.message });
  }
};

// @desc    Log a call (can be used for manual logging if needed)
// @route   POST /api/call
// @access  Protected
exports.logCall = async (req, res) => {
  try {
    const { receiverId, type, status, duration, startedAt, endedAt } = req.body;
    
    const call = await Call.create({
      callerId: req.user.id,
      receiverId,
      type: type || "voice",
      status: status || "completed",
      duration: duration || 0,
      startedAt: startedAt || new Date(),
      endedAt: endedAt || new Date()
    });

    res.status(201).json(call);
  } catch (error) {
    res.status(500).json({ message: "Failed to log call", error: error.message });
  }
};
