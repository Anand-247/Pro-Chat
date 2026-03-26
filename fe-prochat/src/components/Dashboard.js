import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchChats } from "../store/chatSlice";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";

const Dashboard = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user) {
      dispatch(fetchChats());
    }
  }, [dispatch, user]);

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
          <ChatWindow />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
