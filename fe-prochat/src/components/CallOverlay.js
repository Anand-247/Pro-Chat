import React, { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Clock } from "lucide-react";
import { clearIncomingCall, clearActiveCall, toggleMute, setActiveCall } from "../store/callSlice";
import { motion, AnimatePresence } from "framer-motion";

const CallOverlay = ({ socket, webrtcService }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { incomingCall, activeCall, isMuted, localStream, remoteStream } = useSelector((state) => state.call);
  
  const [callDuration, setCallDuration] = useState(0);
  const remoteAudioRef = useRef(null);
  
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

  // Handle remote audio stream
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAccept = async () => {
    if (!incomingCall) return;
    try {
      await webrtcService.handleOffer(incomingCall.signal, incomingCall.from.id);
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
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted; // Toggle based on current Redux state
      });
      dispatch(toggleMute());
    }
  };

  if (!incomingCall && !activeCall) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" />
      
      <audio ref={remoteAudioRef} autoPlay />

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
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             exit={{ scale: 0.9, opacity: 0 }}
             className="relative bg-slate-800/90 border border-white/10 rounded-3xl p-8 w-full max-w-sm flex flex-col items-center shadow-2xl overflow-hidden"
          >
            {/* Background Decorations */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />

            <img 
               src={activeCall.caller.id === user.id ? activeCall.receiver.avatar : activeCall.caller.avatar} 
               className="w-24 h-24 rounded-full border-4 border-slate-700 mb-6 object-cover" 
               alt="participant" 
            />
            
            <h2 className="text-2xl font-bold text-white mb-1">
               {activeCall.caller.id === user.id ? activeCall.receiver.name : activeCall.caller.name}
            </h2>
            
            <div className="flex items-center gap-2 mb-8 text-primary/80 font-mono">
               <Clock size={16} />
               <span>{activeCall.status === "accepted" ? formatDuration(callDuration) : "Ringing..."}</span>
            </div>

            <div className="flex gap-4 w-full justify-center items-center">
              <button 
                onClick={handleToggleMute}
                className={`p-4 rounded-full transition-all ${isMuted ? "bg-red-500/20 text-red-500 border border-red-500/50" : "bg-slate-700 text-slate-300 hover:bg-slate-600 border border-white/5"}`}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              <button onClick={handleEndCall} className="p-5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-shadow shadow-lg shadow-red-500/40">
                <PhoneOff size={28} />
              </button>

              <button className="p-4 bg-slate-700 text-slate-300 rounded-full hover:bg-slate-600 border border-white/5 transition-all">
                <Volume2 size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CallOverlay;
