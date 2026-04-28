import React, { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Clock, Video, VideoOff, Maximize2, Minimize2 } from "lucide-react";
import { clearIncomingCall, clearActiveCall, toggleMute, setActiveCall, toggleVideo, setCameraPaused } from "../store/callSlice";
import { motion, AnimatePresence } from "framer-motion";

const CallOverlay = ({ socket, webrtcService }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { incomingCall, activeCall, isMuted, isVideoEnabled, isCameraPaused, remoteMediaStatus, localStream, remoteStream } = useSelector((state) => state.call);
  
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  
  // Timer for duration
  useEffect(() => {
    let interval;
    if (activeCall && activeCall.status === "accepted") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  // Handle streams
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteMediaStatus.video, activeCall?.type]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoEnabled]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAccept = async () => {
    if (!incomingCall) return;
    try {
      await webrtcService.handleOffer(incomingCall.signal, incomingCall.from.id, incomingCall.type);
      dispatch(setActiveCall({ 
        id: incomingCall.callId,
        caller: incomingCall.from, 
        receiver: user, 
        status: "accepted",
        type: incomingCall.type 
      }));
      dispatch(clearIncomingCall());
    } catch (err) {
      console.error("Failed to accept call", err);
    }
  };

  const handleDecline = () => {
    if (incomingCall) {
      socket.emit("reject-call", { to: incomingCall.from.id, callId: incomingCall.callId });
      dispatch(clearIncomingCall());
    }
  };

  const handleEndCall = () => {
    if (activeCall) {
      const recipientId = activeCall.caller.id === user.id ? activeCall.receiver.id : activeCall.caller.id;
      socket.emit("end-call", { to: recipientId, callId: activeCall.id, duration: callDuration });
      webrtcService.endCall();
      dispatch(clearActiveCall());
    }
  };

  const handleToggleMute = () => {
    const newMuteState = !isMuted;
    webrtcService.toggleAudio(!newMuteState);
    dispatch(toggleMute());
    
    // Notify remote
    const recipientId = activeCall.caller.id === user.id ? activeCall.receiver.id : activeCall.caller.id;
    socket.emit("toggle-media", { to: recipientId, type: "audio", enabled: !newMuteState });
  };

  const handleToggleVideo = async () => {
    const newVideoState = !isVideoEnabled;
    
    if (newVideoState && !localStream.getVideoTracks().length) {
      // If we started as voice call, we might need to add video track
      await webrtcService.addVideoTrack();
    }
    
    webrtcService.toggleVideo(newVideoState);
    dispatch(toggleVideo());
    
    // Notify remote
    const recipientId = activeCall.caller.id === user.id ? activeCall.receiver.id : activeCall.caller.id;
    socket.emit("toggle-media", { to: recipientId, type: "video", enabled: newVideoState });
  };

  if (!incomingCall && !activeCall) return null;

  const participant = activeCall ? (activeCall.caller.id === user.id ? activeCall.receiver : activeCall.caller) : incomingCall?.from;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 transition-all duration-500 ${isFullscreen ? "bg-black" : "bg-slate-900/40 backdrop-blur-xl"}`}>
      
      <AnimatePresence mode="wait">
        {incomingCall ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-slate-800/80 border border-white/10 rounded-3xl p-8 w-full max-w-sm flex flex-col items-center shadow-2xl"
          >
            <div className="relative mb-6">
               <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
               <img src={incomingCall.from.avatar} className="w-24 h-24 rounded-full border-4 border-primary relative z-10 object-cover" alt="caller" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{incomingCall.from.name}</h2>
            <p className="text-primary font-medium mb-8 animate-pulse text-sm uppercase tracking-widest">Incoming {incomingCall.type} call...</p>
            
            <div className="flex gap-8 w-full justify-center">
              <button onClick={handleDecline} className="p-5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all shadow-lg hover:shadow-red-500/20 active:scale-95">
                <PhoneOff size={28} />
              </button>
              <button onClick={handleAccept} className="p-5 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all shadow-lg hover:shadow-green-500/20 active:scale-95 animate-bounce">
                <Phone size={28} />
              </button>
            </div>
          </motion.div>
        ) : activeCall && (
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className={`relative w-full h-full flex flex-col items-center justify-center overflow-hidden transition-all duration-500 ${isFullscreen ? "" : "max-w-4xl max-h-[90vh] md:rounded-3xl border border-white/10 bg-slate-900 shadow-2xl"}`}
          >
            {/* Main Video (Remote) */}
            <div className="absolute inset-0 z-0 bg-slate-800">
              {activeCall.type === "video" && remoteMediaStatus.video ? (
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <img src={participant.avatar} className="w-32 h-32 rounded-full border-4 border-slate-700 mb-4 object-cover" alt="avatar" />
                  <p className="text-slate-400 font-medium">{participant.name}</p>
                  {!remoteMediaStatus.video && activeCall.type === "video" && (
                    <p className="text-xs text-slate-500 mt-2">Camera is off</p>
                  )}
                </div>
              )}
            </div>

            {/* Local PIP Video */}
            {isVideoEnabled && (
              <div className="absolute top-6 right-6 w-32 md:w-48 aspect-video bg-slate-900 rounded-xl overflow-hidden border border-white/20 shadow-2xl z-20">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover mirror"
                />
              </div>
            )}

            {/* Top Overlay (Info & Timer) */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-30 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center gap-3">
                <img src={participant.avatar} className="w-10 h-10 rounded-full border border-white/20" alt="avatar" />
                <div>
                  <h3 className="text-white font-semibold leading-tight">{participant.name}</h3>
                  <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                    <Clock size={12} />
                    <span>{activeCall.status === "accepted" ? formatDuration(callDuration) : "Ringing..."}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 w-full p-8 flex justify-center items-center gap-4 md:gap-6 z-30 bg-gradient-to-t from-black/80 to-transparent">
              <button 
                onClick={handleToggleMute}
                className={`p-4 rounded-full transition-all ${isMuted ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-white/10 text-white hover:bg-white/20"}`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>

              <button 
                onClick={handleToggleVideo}
                className={`p-4 rounded-full transition-all ${!isVideoEnabled ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-white/10 text-white hover:bg-white/20"}`}
                title={isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
              >
                {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
              </button>
              
              <button 
                onClick={handleEndCall} 
                className="p-5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all shadow-xl shadow-red-500/40 transform hover:scale-110 active:scale-95"
                title="End Call"
              >
                <PhoneOff size={32} />
              </button>

              <button className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all">
                <Volume2 size={24} />
              </button>
            </div>

            {/* Status Messages */}
            {!remoteMediaStatus.audio && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-red-500/80 backdrop-blur-md rounded-full text-white text-xs font-medium z-30 animate-fade-in">
                {participant.name} is muted
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        .mirror {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export default CallOverlay;
