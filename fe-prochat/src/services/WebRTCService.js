class WebRTCService {
  constructor(socket, onLocalStream, onRemoteStream) {
    this.socket = socket;
    this.onLocalStream = onLocalStream;
    this.onRemoteStream = onRemoteStream;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = new MediaStream();
    
    // Using public Google STUN servers for local development
    this.config = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    };
  }

  async startLocalStream(callType = "voice") {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: callType === "video" 
      });
      this.onLocalStream(this.localStream);
      return this.localStream;
    } catch (error) {
      console.error("Error accessing media devices", error);
      throw error;
    }
  }

  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  async addVideoTrack() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = stream.getVideoTracks()[0];
      if (this.localStream) {
        this.localStream.addTrack(videoTrack);
        if (this.peerConnection) {
          this.peerConnection.addTrack(videoTrack, this.localStream);
          // Renegotiation might be needed here, but for simplicity we'll assume camera is either on or off from start
          // or we just enable/disable existing track if we requested both initially.
          // In a real app, you'd do createOffer again.
        }
      }
      return videoTrack;
    } catch (err) {
      console.error("Failed to add video track", err);
    }
  }

  initPeerConnection(recipientId) {
    this.peerConnection = new RTCPeerConnection(this.config);

    // Add local tracks to peer connection
    this.localStream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    // Listen for remote tracks
    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
      this.onRemoteStream(this.remoteStream);
    };

    // Listen for ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit("ice-candidate", {
          to: recipientId,
          candidate: event.candidate,
        });
      }
    };

    return this.peerConnection;
  }

  async createOffer(recipientId, userFrom, callType) {
    await this.startLocalStream(callType);
    this.initPeerConnection(recipientId);

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.socket.emit("call-user", {
      userToCall: recipientId,
      signalData: offer,
      from: userFrom,
      type: callType || "voice",
    });
  }

  async handleOffer(offer, callerId, callType) {
    await this.startLocalStream(callType);
    this.initPeerConnection(callerId);

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.socket.emit("answer-call", {
      to: callerId,
      signal: answer,
    });
  }

  async handleAnswer(answer) {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async handleIceCandidate(candidate) {
    if (this.peerConnection) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding received ice candidate", e);
      }
    }
  }

  endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = new MediaStream();
  }
}

export default WebRTCService;
