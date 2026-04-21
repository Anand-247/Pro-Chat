import io from "socket.io-client";

// const ENDPOINT = "http://localhost:8000";
// const ENDPOINT = "http://192.168.31.204:8000";
const ENDPOINT = "https://pro-chat-raq1.onrender.com";

let socket;

export const getSocket = (user) => {
  if (!socket && user) {
    socket = io(ENDPOINT, { 
      transports: ["websocket", "polling", "flashsocket"],
      query: { userId: user.id }
    });
    socket.emit("setup", user);
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
