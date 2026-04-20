const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const { connectDB } = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const chatRoutes = require("./routes/chat.routes");
const messageRoutes = require("./routes/message.routes");
const callRoutes = require("./routes/call.routes");
const { initSocket } = require("./sockets/socket");
  
dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/user", require("./routes/user.routes"));
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/call", callRoutes);
app.use("/api/upload", require("./routes/upload.routes"));

app.get("/", (req, res) => {
  res.send("Pro-Chat API is running...");
});

// Socket
initSocket(server);

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // console.log(`Try it: http://localhost:${PORT}/api`);
});