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

  async startLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      this.onLocalStream(this.localStream);
      return this.localStream;
    } catch (error) {
      console.error("Error accessing microphone", error);
      throw error;
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
    await this.startLocalStream();
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

  async handleOffer(offer, callerId) {
    await this.startLocalStream();
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
