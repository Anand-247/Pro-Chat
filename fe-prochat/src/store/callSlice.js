import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

export const fetchCallHistory = createAsyncThunk(
  "call/fetchHistory",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/call");
      return data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const callSlice = createSlice({
  name: "call",
  initialState: {
    history: [],
    activeCall: null, // { id, caller, receiver, type, signal, status: 'ongoing' | 'incoming' | 'outgoing' | 'accepted' }
    incomingCall: null, // { from, signal, type, callId }
    isMuted: false,
    isVideoEnabled: false,
    isCameraPaused: false,
    remoteMediaStatus: { audio: true, video: true },
    localStream: null,
    remoteStream: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    setIncomingCall: (state, action) => {
      state.incomingCall = action.payload;
    },
    clearIncomingCall: (state) => {
      state.incomingCall = null;
    },
    setActiveCall: (state, action) => {
      state.activeCall = action.payload;
      state.isVideoEnabled = action.payload?.type === "video";
    },
    setCallStatus: (state, action) => {
      if (state.activeCall) {
        state.activeCall.status = action.payload;
      }
    },
    clearActiveCall: (state) => {
      state.activeCall = null;
      state.localStream = null;
      state.remoteStream = null;
      state.isMuted = false;
      state.isVideoEnabled = false;
      state.isCameraPaused = false;
      state.remoteMediaStatus = { audio: true, video: true };
    },
    setLocalStream: (state, action) => {
      state.localStream = action.payload;
    },
    setRemoteStream: (state, action) => {
      state.remoteStream = action.payload;
    },
    toggleMute: (state) => {
      state.isMuted = !state.isMuted;
    },
    toggleVideo: (state) => {
      state.isVideoEnabled = !state.isVideoEnabled;
    },
    setCameraPaused: (state, action) => {
      state.isCameraPaused = action.payload;
    },
    updateRemoteMediaStatus: (state, action) => {
      const { type, enabled } = action.payload;
      state.remoteMediaStatus[type] = enabled;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCallHistory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCallHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.history = action.payload;
      })
      .addCase(fetchCallHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { 
  setIncomingCall, 
  clearIncomingCall, 
  setActiveCall, 
  clearActiveCall, 
  setLocalStream, 
  setRemoteStream, 
  toggleMute,
  toggleVideo,
  setCameraPaused,
  updateRemoteMediaStatus,
  setCallStatus
} = callSlice.actions;

export default callSlice.reducer;
