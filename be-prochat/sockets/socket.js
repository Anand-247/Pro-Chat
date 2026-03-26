const { Server } = require("socket.io");
const { createClient } = require("redis");

const initSocket = async (server) => {
  // Graceful Redis Connection
  let redisClient = null;
  const inMemoryOnlineUsers = new Set(); // Fallback if Redis fails

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      socket: {
        reconnectStrategy: false
      }
    });
    
    redisClient.on("error", (err) => {
      console.error("Redis Client Error", err.message);
    });

    await redisClient.connect();
    console.log("✅ Connected to Redis for active socket tracking");
  } catch (err) {
    console.log("⚠️ Redis connection failed, falling back to in-memory set");
    redisClient = null;
  }

  const io = new Server(server, {
    pingTimeout: 60000,
    cors: { origin: "http://localhost:3000" },
  });

  const getOnlineMembers = async () => {
    if (redisClient) {
      return await redisClient.sMembers("online_users");
    }
    return Array.from(inMemoryOnlineUsers);
  };

  io.on("connection", (socket) => {
    console.log("Connected to socket.io", socket.id);

    socket.on("setup", async (userData) => {
      socket.join(userData.id); // For personal notifications
      socket.userId = userData.id;

      // Add to tracked online users
      if (redisClient) {
        await redisClient.sAdd("online_users", userData.id);
      } else {
        inMemoryOnlineUsers.add(userData.id);
      }

      socket.emit("connected");
      
      // Broadcast updated online list to everyone
      const onlineUsers = await getOnlineMembers();
      io.emit("get_online_users", onlineUsers);
    });

    socket.on("join chat", (room) => {
      socket.join(room); // Join specific chat room
      console.log("User Joined Chat Room: " + room);
    });

    socket.on("typing", (payload) => {
      if (typeof payload === "object" && payload.users) {
        payload.users.forEach((uId) => {
          if (uId !== socket.userId) socket.in(uId).emit("typing", payload.chatId);
        });
      } else {
        socket.in(payload).emit("typing", payload);
      }
    });

    socket.on("stop typing", (payload) => {
      if (typeof payload === "object" && payload.users) {
        payload.users.forEach((uId) => {
          if (uId !== socket.userId) socket.in(uId).emit("stop typing", payload.chatId);
        });
      } else {
        socket.in(payload).emit("stop typing", payload);
      }
    });

    socket.on("new message", (newMessageRecieved) => {
      const chat = newMessageRecieved.Chat || newMessageRecieved.chat;
      
      if (!chat) return console.log("Chat data missing from message payload");
      if (!chat.users || !chat.users.forEach) return console.log("chat.users not defined or not iterable");

      chat.users.forEach((user) => {
        if (user.id === newMessageRecieved.senderId) return;
        // Emit only to members actively in the group
        socket.in(user.id).emit("message received", newMessageRecieved);
      });
    });

    socket.on("mark message delivered", async ({ messageId, chatId }) => {
      const Message = require("../models/message.model");
      await Message.update({ status: "delivered" }, { where: { id: messageId, status: "sent" } });
      socket.in(chatId).emit("message status updated", { messageId, chatId, status: "delivered" });
    });

    socket.on("mark messages read", async ({ chatId, isGroupChat }) => {
      const Message = require("../models/message.model");
      const { Op } = require("sequelize");
      const { sequelize } = require("../config/db");

      if (isGroupChat) {
         await Message.update(
           { 
             readBy: sequelize.fn("array_append", sequelize.col("readBy"), socket.userId)
           },
           {
             where: {
               chatId,
               senderId: { [Op.ne]: socket.userId },
               [Op.not]: { readBy: { [Op.contains]: [socket.userId] } }
             }
           }
         );
         socket.in(chatId).emit("message group read", { chatId, userId: socket.userId });
         return;
      }
      
      await Message.update(
        { status: "read" }, 
        { 
          where: { 
            chatId, 
            senderId: { [Op.ne]: socket.userId },
            status: { [Op.in]: ["sent", "delivered"] }
          } 
        }
      );
      // For 1v1 chats, emit back to the other user so they see blue ticks
      socket.in(chatId).emit("message status updated", { chatId, status: "read" });
    });

    socket.on("message deleted", (payload) => {
      socket.in(payload.chatId).emit("message deleted", payload);
    });

    socket.on("message edited", (message) => {
      socket.in(message.chatId).emit("message edited", message);
    });

    socket.on("message reacted", (message) => {
      socket.in(message.chatId).emit("message reacted", message);
    });
    
    socket.on("disconnect", async () => {
      console.log("USER DISCONNECTED", socket.userId);
      socket.leave(socket.userId);
      
      if (socket.userId) {
        if (redisClient) {
          await redisClient.sRem("online_users", socket.userId);
        } else {
          inMemoryOnlineUsers.delete(socket.userId);
        }

        const onlineUsers = await getOnlineMembers();
        io.emit("get_online_users", onlineUsers);
      }
    });
  });
};

module.exports = { initSocket };
