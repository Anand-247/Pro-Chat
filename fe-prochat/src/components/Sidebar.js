import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Search, Plus, LogOut, Loader2, X, Check, MessageSquare, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";
import { setActiveChat, accessChat, createGroupChat } from "../store/chatSlice";
import { fetchCallHistory } from "../store/callSlice";
import { logout, updateProfileAction } from "../store/authSlice";
import api from "../services/api";

const Sidebar = () => {
  const dispatch = useDispatch();
  const { chats, activeChat, isLoading, typingChats } = useSelector((state) => state.chat);
  const { user, onlineUsers } = useSelector((state) => state.auth);
  const { history: callHistory, isLoading: isCallsLoading } = useSelector((state) => state.call);
  
  const [activeTab, setActiveTab] = useState("chats"); // "chats" or "calls"
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Group logic
  const [isGroupCreating, setIsGroupCreating] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Profile logic
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState("");

  const handleOpenProfile = () => {
    setProfileName(user?.name || "");
    setIsProfileModalOpen(true);
  };
  
  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;
    await dispatch(updateProfileAction({ name: profileName }));
    setIsProfileModalOpen(false);
  };

  useEffect(() => {
    if (activeTab === "calls") {
      dispatch(fetchCallHistory());
    }
  }, [activeTab, dispatch]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const { data } = await api.get(`/user?search=${searchQuery}`);
        setSearchResults(data);
      } catch (error) {
        console.error("Failed to search users", error);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = () => {
    dispatch(logout());
  };

  const startChat = (userId) => {
    dispatch(accessChat(userId));
    setSearchQuery(""); // Clear search to switch back to chat history
    setSearchResults([]);
  };

  const handleUserSelect = (usr) => {
     if (isGroupCreating) {
        if (!selectedUsers.find(u => u.id === usr.id)) {
           setSelectedUsers([...selectedUsers, usr]);
        }
     } else {
        startChat(usr.id);
     }
  };

  const submitCreateGroup = () => {
    if (!groupName || selectedUsers.length < 2) return;
    dispatch(createGroupChat({ name: groupName, users: JSON.stringify(selectedUsers.map(u => u.id)) }));
    setIsGroupCreating(false);
    setGroupName("");
    setSelectedUsers([]);
    setSearchQuery("");
  };

  const getChatName = (chat, loggedUser) => {
    if (chat.isGroupChat) return chat.name;
    const otherUser = chat.users.find((u) => u.id !== loggedUser.id);
    return otherUser ? otherUser.name : "Unknown User";
  };

  const getChatAvatar = (chat, loggedUser) => {
    if (chat.isGroupChat) return chat.avatar || "https://icon-library.com/images/group-icon-png/group-icon-png-14.jpg";
    const otherUser = chat.users.find((u) => u.id !== loggedUser.id);
    return otherUser ? otherUser.avatar : "";
  };

  const isUserOnline = (chat, loggedUser) => {
    if (chat.isGroupChat) return false;
    const otherUser = chat.users.find((u) => u.id !== loggedUser.id);
    return otherUser ? onlineUsers?.includes(otherUser.id) : false;
  };

  return (
    <div className="glass-container h-full flex flex-col overflow-hidden relative">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/40">
        <div onClick={handleOpenProfile} className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-1 -ml-1 rounded-lg transition-colors group">
          <div className="relative">
             <img src={user?.avatar} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-primary" />
             <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></span>
          </div>
          <div>
            <h2 className="font-semibold text-white group-hover:text-primary transition-colors">{user?.name}</h2>
            <p className="text-xs text-primary">Online</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsGroupCreating(!isGroupCreating)} className={`p-2 rounded-full transition-colors ${isGroupCreating ? "bg-primary text-white" : "hover:bg-white/10 text-slate-300"}`}>
            {isGroupCreating ? <X size={20} /> : <Plus size={20} />}
          </button>
          <button onClick={handleLogout} className="p-2 hover:bg-red-500/20 text-red-400 rounded-full transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {isGroupCreating && (
          <div className="animate-fade-in flex flex-col gap-3">
             <div className="flex items-center gap-2">
               <input 
                 type="text" 
                 placeholder="Group Name" 
                 value={groupName}
                 onChange={(e) => setGroupName(e.target.value)}
                 className="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary"
               />
               <button 
                 onClick={submitCreateGroup} 
                 disabled={!groupName || selectedUsers.length < 2}
                 className="p-2 bg-primary text-white rounded-lg disabled:opacity-50 hover:bg-primary-hover flex-shrink-0"
               >
                 <Check size={20} />
               </button>
             </div>
             {selectedUsers.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                   {selectedUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-1 bg-primary/20 text-primary border border-primary/30 rounded-full pl-2 pr-1 py-1 text-xs whitespace-nowrap">
                         {u.name.split(" ")[0]} 
                         <button onClick={() => setSelectedUsers(selectedUsers.filter(s => s.id !== u.id))} className="hover:text-white"><X size={12} /></button>
                      </div>
                   ))}
                </div>
             )}
          </div>
        )}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isGroupCreating ? "Search users to add..." : "Search users to start a chat..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/50 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="px-4 pb-2 flex border-b border-white/5 mx-2">
        <button 
          onClick={() => setActiveTab("chats")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all border-b-2 ${activeTab === "chats" ? "text-primary border-primary" : "text-slate-500 border-transparent hover:text-slate-300"}`}
        >
          <MessageSquare size={18} />
          Chats
        </button>
        <button 
          onClick={() => setActiveTab("calls")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all border-b-2 ${activeTab === "calls" ? "text-primary border-primary" : "text-slate-500 border-transparent hover:text-slate-300"}`}
        >
          <Phone size={18} />
          Calls
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {searchQuery ? (
           // Render Search Results
           isSearching ? (
             <div className="flex justify-center mt-10 text-primary">
                <Loader2 size={24} className="animate-spin" />
             </div>
           ) : searchResults.length > 0 ? (
             searchResults.map((usr) => (
                <div
                  key={usr.id}
                  onClick={() => handleUserSelect(usr)}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-white/5 border border-transparent hover:border-white/10"
                >
                   <img src={usr.avatar} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
                   <div>
                     <p className="text-slate-200 font-medium">{usr.name}</p>
                     <p className="text-slate-400 text-xs">{usr.email}</p>
                   </div>
                </div>
             ))
           ) : (
             <p className="text-center text-slate-500 mt-10 text-sm">No users found.</p>
           )
        ) : activeTab === "calls" ? (
           // Render Call History
           isCallsLoading ? (
             <div className="flex justify-center mt-10 text-primary">
                <Loader2 size={24} className="animate-spin" />
             </div>
           ) : callHistory.length > 0 ? (
             callHistory.map((call) => {
               const isOutgoing = call.callerId === user.id;
               const participant = isOutgoing ? call.receiver : call.caller;
               
               return (
                 <div
                   key={call.id}
                   className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/5 border border-transparent"
                 >
                    <img src={participant?.avatar} alt="avatar" className="w-12 h-12 rounded-full object-cover bg-slate-800" />
                    <div className="flex-1 min-w-0">
                       <h3 className="font-medium text-slate-200 truncate">{participant?.name}</h3>
                       <div className="flex items-center gap-1.5 mt-0.5">
                          {call.status === "missed" ? (
                             <PhoneMissed size={14} className="text-red-500" />
                          ) : isOutgoing ? (
                             <PhoneOutgoing size={14} className="text-green-500" />
                          ) : (
                             <PhoneIncoming size={14} className="text-sky-500" />
                          )}
                          <p className="text-xs text-slate-400">
                             {call.status === "missed" ? "Missed" : call.status === "rejected" ? "Declined" : isOutgoing ? "Outgoing" : "Incoming"} · {new Date(call.createdAt).toLocaleDateString()}
                          </p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-slate-500">{new Date(call.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                       {call.duration > 0 && <p className="text-[10px] text-primary font-mono mt-0.5">{Math.floor(call.duration/60)}:{(call.duration%60).toString().padStart(2, '0')}</p>}
                    </div>
                 </div>
               );
             })
           ) : (
             <p className="text-center text-slate-500 mt-10 text-sm">No calls yet.</p>
           )
        ) : (
           // Render Chat History
           isLoading && chats.length === 0 ? (
            <p className="text-center text-slate-500 mt-10 text-sm">Loading chats...</p>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => dispatch(setActiveChat(chat))}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  activeChat?.id === chat.id ? "bg-primary/20 border border-primary/30" : "hover:bg-white/5"
                }`}
              >
                <div className="relative">
                  <img
                    src={getChatAvatar(chat, user)}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full object-cover bg-slate-800"
                  />
                  {isUserOnline(chat, user) && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-slate-900 rounded-full"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-medium text-slate-200 truncate">{getChatName(chat, user)}</h3>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {chat.latestMessage ? new Date(chat.latestMessage.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 truncate flex items-center gap-1.5">
                    {(() => {
                       const myMember = chat.users?.find(u => u.id === user.id)?.ConversationMember;
                       if (myMember?.leftAt) {
                          return (
                             <span className="text-amber-500/80 text-[11px] font-medium px-1.5 py-0.5 bg-amber-500/10 rounded flex items-center gap-1">
                                {myMember.leftReason === 'removed' ? 'You were removed' : 'You left the group'}
                             </span>
                          );
                       }
                       if (typingChats && typingChats[chat.id]) {
                          return <span className="text-primary italic animate-pulse group-hover:text-white transition-colors">Typing...</span>;
                       }
                       if (chat.latestMessage) {
                          return chat.latestMessage.senderId === user.id ? `You: ${chat.latestMessage.content}` : chat.latestMessage.content;
                       }
                       return "No messages yet";
                    })()}
                  </p>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Profile Edit Modal */}
      {isProfileModalOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in p-6 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
           <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b border-white/5">
                 <h2 className="font-semibold text-lg text-white">Edit Profile</h2>
                 <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
              </div>
              <div className="p-6 flex flex-col items-center">
                 <img src={user?.avatar} alt="avatar" className="w-24 h-24 rounded-full object-cover border-4 border-slate-700 mb-6" />
                 
                 <div className="w-full flex justify-between gap-2 text-left">
                    <div className="w-full">
                       <label className="text-xs text-slate-400 mb-1 block ml-1">Display Name</label>
                       <input 
                         type="text" 
                         value={profileName}
                         onChange={(e) => setProfileName(e.target.value)}
                         className="w-full bg-slate-900 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:border-primary text-sm transition-colors"
                         placeholder="Your Name"
                       />
                    </div>
                 </div>
                 
                 <button 
                    onClick={handleSaveProfile} 
                    className="w-full mt-6 bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20"
                 >
                    Save Changes
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Sidebar;
