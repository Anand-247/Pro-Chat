const { Server } = require("socket.io");
const { createClient } = require("redis");
const { User, Message, MessageReceipt, Conversation, Call, PushToken } = require("../models");
const { Op } = require("sequelize");
const { sendPushNotification } = require("../config/firebase");

const initSocket = async (server) => {
  // Graceful Redis Connection
  let redisClient = null;
  const inMemoryOnlineUsers = new Set(); // Fallback if Redis fails

  try {
    redisClient = createClient({
      username: 'default',
      password: process.env.REDIS_PASSWORD,
      socket: {
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT
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

      // Update User in DB
      await User.update({ isOnline: true }, { where: { id: userData.id } });

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
      // payload could be { conversationId, users }
      const convId = payload.conversationId || payload.chatId || payload;
      if (typeof payload === "object" && payload.users) {
        payload.users.forEach((uId) => {
          if (uId !== socket.userId) socket.in(uId).emit("typing", convId);
        });
      } else {
        socket.in(convId).emit("typing", convId);
      }
    });

    socket.on("stop typing", (payload) => {
      const convId = payload.conversationId || payload.chatId || payload;
      if (typeof payload === "object" && payload.users) {
        payload.users.forEach((uId) => {
          if (uId !== socket.userId) socket.in(uId).emit("stop typing", convId);
        });
      } else {
        socket.in(convId).emit("stop typing", convId);
      }
    });

    socket.on("new message", (newMessageReceived) => {
      const conv = newMessageReceived.Conversation || newMessageReceived.conversation || newMessageReceived.Chat || newMessageReceived.chat;
      
      if (!conv) return console.log("Conversation data missing from message payload");
      
      const users = conv.users;
      if (!users || !users.forEach) return console.log("conversation.users not defined or not iterable");

      users.forEach((u) => {
        if (u.id === newMessageReceived.senderId) return;
        
        // Skip users who have left or were removed from the chat
        if (u.ConversationMember?.leftAt) return;
        
        socket.in(u.id).emit("message received", newMessageReceived);
      });
    });

    socket.on("mark message delivered", async ({ messageId, conversationId }) => {
       await MessageReceipt.update(
          { deliveredAt: new Date() },
          { where: { messageId, userId: socket.userId, deliveredAt: null } }
       );
       socket.in(conversationId).emit("message status updated", { messageId, conversationId, status: "delivered", userId: socket.userId });
    });

    socket.on("mark messages read", async ({ chatId, conversationId }) => {
      const convId = conversationId || chatId;
      
      // Mark all unread receipts for this user in this conversation as read
      const unreadReceipts = await MessageReceipt.findAll({
         include: [{
            model: Message,
            where: { conversationId: convId }
         }],
         where: { userId: socket.userId, readAt: null }
      });

      if (unreadReceipts.length > 0) {
         const receiptIds = unreadReceipts.map(r => r.id);
         await MessageReceipt.update(
            { readAt: new Date(), deliveredAt: new Date() }, // If read, it was delivered
            { where: { id: { [Op.in]: receiptIds } } }
         );

         socket.in(convId).emit("message group read", { chatId: convId, conversationId: convId, userId: socket.userId });
      }
    });

    socket.on("message deleted", (payload) => {
      const convId = payload.conversationId || payload.chatId;
      socket.in(convId).emit("message deleted", payload);
    });

    socket.on("message edited", (message) => {
      const convId = message.conversationId || message.chatId;
      socket.in(convId).emit("message edited", message);
    });

    socket.on("message reacted", (message) => {
      const convId = message.conversationId || message.chatId;
      socket.in(convId).emit("message reacted", message);
    });

    // ==== CALLING LOGIC ====
    socket.on("call-user", async ({ userToCall, from, signalData, type }) => {
      // Create a pending call record
      const call = await Call.create({
        callerId: from.id,
        receiverId: userToCall,
        type: type || "voice",
        status: "ongoing",
        startedAt: new Date()
      });

      // Emit to the specific user's room
      socket.to(userToCall).emit("incoming-call", {
        from,
        signal: signalData,
        type: type || "voice",
        callId: call.id
      });

      // Also send a push notification to ensure they see it if they are on mobile/background
      try {
        const tokens = await PushToken.findAll({ where: { userId: userToCall } });
        tokens.forEach(t => {
          sendPushNotification(t.token, {
            title: `Incoming ${type || 'voice'} call`,
            body: `${from.name} is calling you...`,
            data: { 
              type: "call", 
              callerId: from.id, 
              callerName: from.name, 
              callId: call.id.toString(),
              callType: type || "voice"
            }
          });
        });
      } catch (err) {
        console.error("Failed to send call push notification:", err);
      }
    });

    socket.on("answer-call", async (data) => {
      // data: { to, signal, callId }
      socket.to(data.to).emit("call-accepted", data.signal);
    });

    socket.on("reject-call", async ({ to, callId, reason }) => {
      if (callId) {
        await Call.update({ status: "rejected", endedAt: new Date() }, { where: { id: callId } });
      }
      socket.to(to).emit("call-rejected", { reason: reason || "declined" });
    });

    socket.on("end-call", async ({ to, callId, duration }) => {
      if (callId) {
        await Call.update({ 
          status: "completed", 
          endedAt: new Date(),
          duration: duration || 0
        }, { where: { id: callId } });
      }
      socket.to(to).emit("call-ended");
    });
    
    socket.on("ice-candidate", (data) => {
      // data: { to, candidate }
      socket.to(data.to).emit("ice-candidate", data.candidate);
    });

    socket.on("call-busy", ({ to }) => {
      socket.to(to).emit("call-rejected", { reason: "busy" });
    });
    
    socket.on("disconnect", async () => {
      console.log("USER DISCONNECTED", socket.userId);
      
      if (socket.userId) {
        socket.leave(socket.userId);
        
        // Update DB
        await User.update({ isOnline: false, lastSeenAt: new Date() }, { where: { id: socket.userId } });

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
