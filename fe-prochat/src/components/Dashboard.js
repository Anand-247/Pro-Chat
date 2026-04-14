import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchChats } from "../store/chatSlice";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import CallOverlay from "./CallOverlay";
import { getSocket } from "../services/socket";
import WebRTCService from "../services/WebRTCService";
import { setIncomingCall, setActiveCall, setRemoteStream, setLocalStream, clearActiveCall } from "../store/callSlice";

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { activeCall } = useSelector((state) => state.call);

  // Use a ref for webrtcService to persist across re-renders
  const webrtcServiceRef = React.useRef(null);

  useEffect(() => {
    if (user) {
      dispatch(fetchChats());
      
      const socket = getSocket(user);
      
      if (!webrtcServiceRef.current) {
        webrtcServiceRef.current = new WebRTCService(
          socket,
          (stream) => dispatch(setLocalStream(stream)),
          (stream) => dispatch(setRemoteStream(stream))
        );
      }

      // Voice Call Event Listeners
      socket.on("incoming-call", (data) => {
        dispatch(setIncomingCall(data));
      });

      socket.on("call-accepted", async (signal) => {
        await webrtcServiceRef.current.handleAnswer(signal);
        dispatch(setActiveCall({ ...activeCall, status: "accepted" }));
      });

      socket.on("ice-candidate", async (candidate) => {
        await webrtcServiceRef.current.handleIceCandidate(candidate);
      });

      socket.on("call-rejected", ({ reason }) => {
        alert(reason === "busy" ? "User is busy" : "Call rejected");
        webrtcServiceRef.current.endCall();
        dispatch(clearActiveCall());
      });

      socket.on("call-ended", () => {
        webrtcServiceRef.current.endCall();
        dispatch(clearActiveCall());
      });

      return () => {
        socket.off("incoming-call");
        socket.off("call-accepted");
        socket.off("ice-candidate");
        socket.off("call-rejected");
        socket.off("call-ended");
      };
    }
  }, [dispatch, user, activeCall]);

  return (
    <div className="flex h-screen bg-dark-bg overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-indigo-600/10 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-purple-600/10 rounded-full blur-[128px]"></div>
      </div>

      {/* Main Layout Layer */}
      <div className="relative z-10 flex w-full h-full p-4 gap-4 max-w-[1600px] mx-auto">
        <div className="w-1/3 flex-shrink-0 min-w-[320px] max-w-[400px]">
          <Sidebar />
        </div>
        <div className="flex-1 flex min-w-0">
          <ChatWindow webrtcService={webrtcServiceRef.current} />
        </div>
      </div>
      
      {/* Voice Call Overlay */}
      <CallOverlay 
        socket={getSocket(user)} 
        webrtcService={webrtcServiceRef.current} 
      />
    </div>
  );
};

export default Dashboard;
