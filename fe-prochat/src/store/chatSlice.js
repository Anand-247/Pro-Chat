import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

const initialState = {
  chats: [],
  activeChat: null,
  typingChats: {}, // Maps chatId -> true
  isLoading: false,
  isError: false,
  message: "",
};

// Fetch all chats
export const fetchChats = createAsyncThunk(
  "chat/fetchChats",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/chat");
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update member role (promote/demote)
export const updateMemberRoleAction = createAsyncThunk(
  "chat/updateMemberRole",
  async ({ chatId, userId, role }, thunkAPI) => {
    try {
      const response = await api.put("/chat/groupadmin", { chatId, userId, role });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Access or create a 1v1 chat
export const accessChat = createAsyncThunk(
  "chat/accessChat",
  async (userId, thunkAPI) => {
    try {
      const response = await api.post("/chat", { userId });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create a group chat
export const createGroupChat = createAsyncThunk(
  "chat/createGroupChat",
  async (groupData, thunkAPI) => {
    try {
      const response = await api.post("/chat/group", groupData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete/Leave Chat
export const deleteChatAction = createAsyncThunk(
  "chat/deleteChat",
  async (chatId, thunkAPI) => {
    try {
      await api.delete(`/chat/${chatId}`);
      return chatId;
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Clear Chat Messages
export const clearChatAction = createAsyncThunk(
  "chat/clearChat",
  async (chatId, thunkAPI) => {
    try {
      await api.delete(`/message/clear/${chatId}`);
      return chatId;
    } catch (error) {
      const message = error.response?.data?.message || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveChat: (state, action) => {
      state.activeChat = action.payload;
      if (action.payload?.id) {
        localStorage.setItem("activeChatId", action.payload.id);
      } else {
        localStorage.removeItem("activeChatId");
      }
    },
    setTypingChat: (state, action) => {
      const { chatId, isTyping } = action.payload;
      if (isTyping) {
        state.typingChats[chatId] = true;
      } else {
        delete state.typingChats[chatId];
      }
    },
    updateChatLatestMessage: (state, action) => {
      const { chatId, message } = action.payload;
      const chatIndex = state.chats.findIndex((c) => c.id === chatId);
      if (chatIndex !== -1) {
        state.chats[chatIndex].latestMessage = message;
        const chat = state.chats.splice(chatIndex, 1)[0];
        state.chats.unshift(chat);
      }
    },
    removeChatLocally: (state, action) => {
      state.chats = state.chats.filter(c => c.id !== action.payload);
      if (state.activeChat?.id === action.payload) {
         state.activeChat = null;
         localStorage.removeItem("activeChatId");
      }
    },
    resetChatState: () => {
       localStorage.removeItem("activeChatId");
       return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChats.pending, (state) => { state.isLoading = true; })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.chats = action.payload;
        
        // Restore active chat if it exists in localStorage
        const savedChatId = localStorage.getItem("activeChatId");
        if (savedChatId && !state.activeChat) {
          const chat = action.payload.find(c => c.id === savedChatId);
          if (chat) state.activeChat = chat;
        }
      })
      .addCase(fetchChats.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(accessChat.pending, (state) => { state.isLoading = true; })
      .addCase(accessChat.fulfilled, (state, action) => {
        state.isLoading = false;
        if (!state.chats.find((c) => c.id === action.payload.id)) {
          state.chats = [action.payload, ...state.chats];
        }
        state.activeChat = action.payload;
        localStorage.setItem("activeChatId", action.payload.id);
      })
      .addCase(accessChat.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(createGroupChat.fulfilled, (state, action) => {
        state.chats = [action.payload, ...state.chats];
        state.activeChat = action.payload;
        localStorage.setItem("activeChatId", action.payload.id);
      })
      .addCase(updateMemberRoleAction.fulfilled, (state, action) => {
        state.activeChat = action.payload;
      })
      .addCase(deleteChatAction.fulfilled, (state, action) => {
        state.chats = state.chats.filter(c => c.id !== action.payload);
        if (state.activeChat?.id === action.payload) {
          state.activeChat = null;
          localStorage.removeItem("activeChatId");
        }
      });
  },
});

export const { setActiveChat, setTypingChat, updateChatLatestMessage, removeChatLocally, resetChatState } = chatSlice.actions;
export default chatSlice.reducer;
