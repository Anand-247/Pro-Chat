import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

const initialState = {
  messages: [],
  isLoading: false,
  isError: false,
  message: "",
};

// Fetch messages for a chat
export const fetchMessages = createAsyncThunk(
  "message/fetchMessages",
  async (chatId, thunkAPI) => {
    try {
      const response = await api.get(`/message/${chatId}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Send a new message
export const sendMessage = createAsyncThunk(
  "message/sendMessage",
  async (messageData, thunkAPI) => {
    try {
      const response = await api.post("/message", messageData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const deleteMessageAction = createAsyncThunk(
  "message/deleteMessage",
  async ({ messageId, target }, thunkAPI) => {
    try {
      const response = await api.delete(`/message/${messageId}?target=${target}`);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const editMessageAction = createAsyncThunk(
  "message/editMessage",
  async ({ messageId, content }, thunkAPI) => {
    try {
      const response = await api.put(`/message/${messageId}`, { content });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const reactToMessageAction = createAsyncThunk(
  "message/reactToMessage",
  async ({ messageId, emoji }, thunkAPI) => {
    try {
      const response = await api.put(`/message/${messageId}/react`, { emoji });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    addMessageSockets: (state, action) => {
      state.messages.push(action.payload);
    },
    updateMessageSockets: (state, action) => {
      const { id, content, isDeleted } = action.payload;
      const msg = state.messages.find((m) => m.id === id);
      if (msg) {
        msg.content = content;
        msg.isDeleted = isDeleted;
      }
    },
    addOptimisticMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    replaceOptimisticMessage: (state, action) => {
      const { tempId, message } = action.payload;
      const index = state.messages.findIndex(m => m.id === tempId);
      if (index !== -1) {
        state.messages[index] = message;
      }
    },
    updateMessageStatus: (state, action) => {
      const { messageId, status } = action.payload;
      const msg = state.messages.find(m => m.id === messageId);
      if (msg && msg.status !== "read") {
        msg.status = status;
      }
    },
    updateAllMessagesStatus: (state, action) => {
      const { chatId, status } = action.payload;
      state.messages.forEach(m => {
        if (m.chatId === chatId && m.status !== "read") {
           m.status = status;
        }
      });
    },
    updateGroupMessageReadBy: (state, action) => {
       const { chatId, userId } = action.payload;
       state.messages.forEach(m => {
          if (m.chatId === chatId && m.senderId !== userId && (!m.readBy || !m.readBy.includes(userId))) {
             if (!m.readBy) m.readBy = [];
             m.readBy.push(userId);
          }
       });
    },
    replaceSingleMessage: (state, action) => {
      const message = action.payload;
      const index = state.messages.findIndex(m => m.id === message.id);
      if (index !== -1) {
        state.messages[index] = { ...state.messages[index], ...message };
      }
    },
    resetMessageState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        state.messages = action.payload;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(deleteMessageAction.fulfilled, (state, action) => {
        const { id, content, isDeleted, target } = action.payload;
        if (target === "me") {
          state.messages = state.messages.filter((m) => m.id !== id);
        } else {
          const msg = state.messages.find((m) => m.id === id);
          if (msg) {
            msg.content = content;
            msg.isDeleted = isDeleted;
          }
        }
      })
      .addCase(editMessageAction.fulfilled, (state, action) => {
        const updatedMsg = action.payload;
        const index = state.messages.findIndex(m => m.id === updatedMsg.id);
        if (index !== -1) {
          state.messages[index] = { ...state.messages[index], ...updatedMsg };
        }
      })
      .addCase(reactToMessageAction.fulfilled, (state, action) => {
        const updatedMsg = action.payload;
        const index = state.messages.findIndex(m => m.id === updatedMsg.id);
        if (index !== -1) {
          state.messages[index] = { ...state.messages[index], ...updatedMsg };
        }
      });
  },
});

export const { addMessageSockets, updateMessageSockets, addOptimisticMessage, replaceOptimisticMessage, updateMessageStatus, updateAllMessagesStatus, updateGroupMessageReadBy, replaceSingleMessage, resetMessageState } = messageSlice.actions;
export default messageSlice.reducer;

