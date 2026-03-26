import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import chatReducer from "./chatSlice";
import messageReducer from "./messageSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    message: messageReducer,
  },
});
