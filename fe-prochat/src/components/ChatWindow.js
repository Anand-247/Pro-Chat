import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMessages, sendMessage, addMessageSockets, deleteMessageAction, updateMessageSockets, addOptimisticMessage, replaceOptimisticMessage, updateMessageStatus, updateAllMessagesStatus, updateGroupMessageReadBy, editMessageAction, reactToMessageAction, replaceSingleMessage } from "../store/messageSlice";
import { setOnlineUsers } from "../store/authSlice";
import { updateChatLatestMessage, deleteChatAction, clearChatAction, removeChatLocally, setActiveChat, setTypingChat, updateMemberRoleAction, fetchChats } from "../store/chatSlice";
import { Send, Smile, Paperclip, MoreVertical, Loader2, Trash2, Clock, Check, CheckCheck, Edit2, Trash, X, Info, LogOut, UserMinus, Plus, Crown, ShieldCheck, UserX, UserCheck, Phone, Video, ArrowLeft } from "lucide-react";
import api from "../services/api";
import { getSocket } from "../services/socket";
import { setActiveCall } from "../store/callSlice";

// Prevent reconnecting sockets un-necessarily in dev mode or re-renders
let socket, selectedChatCompare;

const ChatWindow = ({ webrtcService }) => {
  const dispatch = useDispatch();
  const { activeChat } = useSelector((state) => state.chat);
  const { messages, isLoading } = useSelector((state) => state.message);
  const { user, onlineUsers } = useSelector((state) => state.auth);

  const [newMessage, setNewMessage] = useState("");
  const [editingMessage, setEditingMessage] = useState(null);
  const [showReactions, setShowReactions] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  // Modals & Menus
  const [showMessageDetails, setShowMessageDetails] = useState(null);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  
  const scrollRef = useRef(null);

  // Initialize Socket Connection
  useEffect(() => {
    socket = getSocket(user);
    if (!socket) return;

    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", (chatId) => {
       if (selectedChatCompare && selectedChatCompare.id === chatId) setIsTyping(true);
       dispatch(setTypingChat({ chatId, isTyping: true }));
    });
    socket.on("stop typing", (chatId) => {
       if (selectedChatCompare && selectedChatCompare.id === chatId) setIsTyping(false);
       dispatch(setTypingChat({ chatId, isTyping: false }));
    });
    socket.on("get_online_users", (users) => dispatch(setOnlineUsers(users)));

    return () => {
      // Don't disconnect here as we want it to stay global
      socket.off("connected");
      socket.off("typing");
      socket.off("stop typing");
      socket.off("get_online_users");
    };
  }, [user, dispatch]);

  // Fetch Messages on Chat Change
  useEffect(() => {
    if (!activeChat) return;

    dispatch(fetchMessages(activeChat.id)).then(() => {
       if (socketConnected) {
         socket.emit("mark messages read", { chatId: activeChat.id, isGroupChat: activeChat.isGroupChat });
       }
    });
    selectedChatCompare = activeChat;
    socket.emit("join chat", activeChat.id);
  }, [activeChat, dispatch, socketConnected]);

  // Socket Receive Message Listener
  useEffect(() => {
    const handleMessageReceived = (newMessageReceived) => {
      if (!selectedChatCompare || selectedChatCompare.id !== newMessageReceived.chatId) {
        socket.emit("mark message delivered", { messageId: newMessageReceived.id, chatId: newMessageReceived.chatId });
      } else {
        dispatch(addMessageSockets(newMessageReceived));
        socket.emit("mark messages read", { chatId: selectedChatCompare.id, isGroupChat: selectedChatCompare.isGroupChat });
      }
      if (newMessageReceived.type === "system") {
         dispatch(fetchChats());
      }
      dispatch(updateChatLatestMessage({ chatId: newMessageReceived.chatId, message: newMessageReceived }));
    };

    const handleMessageStatusUpdated = (payload) => {
      if (payload.messageId) {
         dispatch(updateMessageStatus(payload));
      } else if (payload.chatId) {
         dispatch(updateAllMessagesStatus(payload));
      }
    };

    const handleMessageDeleted = (deletedMessage) => {
      if (!selectedChatCompare || selectedChatCompare.id !== deletedMessage.chatId) return;
      dispatch(updateMessageSockets(deletedMessage));
    };
    
    const handleMessageEdited = (message) => {
      if (!selectedChatCompare || selectedChatCompare.id !== message.chatId) return;
      dispatch(replaceSingleMessage(message));
    };

    const handleMessageReacted = (message) => {
      if (!selectedChatCompare || selectedChatCompare.id !== message.chatId) return;
      dispatch(replaceSingleMessage(message));
    };

    const handleMessageGroupRead = (payload) => {
      if (!selectedChatCompare || selectedChatCompare.id !== payload.chatId) return;
      dispatch(updateGroupMessageReadBy(payload));
    };

    if (socket) {
      socket.on("message received", handleMessageReceived);
      socket.on("message status updated", handleMessageStatusUpdated);
      socket.on("message group read", handleMessageGroupRead);
      socket.on("message deleted", handleMessageDeleted);
      socket.on("message edited", handleMessageEdited);
      socket.on("message reacted", handleMessageReacted);
    }

    return () => {
      if (socket) {
        socket.off("message received", handleMessageReceived);
        socket.off("message status updated", handleMessageStatusUpdated);
        socket.off("message group read", handleMessageGroupRead);
        socket.off("message deleted", handleMessageDeleted);
        socket.off("message edited", handleMessageEdited);
        socket.off("message reacted", handleMessageReacted);
      }
    };
  }, [dispatch]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    // Stop typing indication
    socket.emit("stop typing", { chatId: activeChat.id, users: activeChat.users.map(u => u.id) });
    setTyping(false);
    
    const content = newMessage;
    setNewMessage("");

    if (editingMessage) {
       const actionResult = await dispatch(editMessageAction({ messageId: editingMessage.id, content }));
       if (actionResult.payload) socket.emit("message edited", { ...actionResult.payload, chatId: activeChat.id });
       setEditingMessage(null);
       return;
    }

    const tempId = `temp-${Date.now()}`;
    dispatch(addOptimisticMessage({
      id: tempId,
      content,
      senderId: user.id,
      chatId: activeChat.id,
      status: "sending",
      createdAt: new Date().toISOString()
    }));

    const actionResult = await dispatch(sendMessage({ content, chatId: activeChat.id }));
    if (actionResult.payload) {
      dispatch(replaceOptimisticMessage({ tempId, message: actionResult.payload }));
      socket.emit("new message", actionResult.payload);
      dispatch(updateChatLatestMessage({ chatId: activeChat.id, message: actionResult.payload }));
    }
  };

  const handleDeleteMessage = async (messageId, target = "everyone") => {
    if (window.confirm(`Delete this message for ${target}?`)) {
      const result = await dispatch(deleteMessageAction({ messageId, target }));
      if (result.payload && target === "everyone") {
         socket.emit("message deleted", { ...result.payload, chatId: activeChat.id });
      }
    }
  };

  const handleReactToMessage = async (messageId, emoji) => {
    const result = await dispatch(reactToMessageAction({ messageId, emoji }));
    if (result.payload) {
       socket.emit("message reacted", { ...result.payload, chatId: activeChat.id });
    }
    setShowReactions(null);
  };

  const handleClearChat = async () => {
    if (window.confirm("Are you sure you want to clear all messages for yourself?")) {
      await dispatch(clearChatAction(activeChat.id));
      dispatch(fetchMessages(activeChat.id)); // Reloads empty list
    }
  };

  const handleDeleteChat = async () => {
    if (window.confirm(activeChat.isGroupChat ? "Leave this group?" : "Delete this chat?")) {
      if (activeChat.isGroupChat && !hasLeftChat) {
         const sysResult = await dispatch(sendMessage({ content: `${user.name} left`, chatId: activeChat.id, type: "system" }));
         if (sysResult.payload) socket.emit("new message", sysResult.payload);
      }
      await dispatch(deleteChatAction(activeChat.id));
      dispatch(removeChatLocally(activeChat.id));
    }
  };

  const handleUpdateRole = async (targetUserId, newRole) => {
    try {
       const result = await dispatch(updateMemberRoleAction({ chatId: activeChat.id, userId: targetUserId, role: newRole }));
       if (result.payload) {
          const targetUser = activeChat.users.find(u => u.id === targetUserId);
          const sysMsg = `${user.name} ${newRole === "admin" ? "made" : "removed"} ${targetUser?.name} ${newRole === "admin" ? "an admin" : "as admin"}`;
          const sysResult = await dispatch(sendMessage({ content: sysMsg, chatId: activeChat.id, type: "system" }));
          if (sysResult.payload) {
             socket.emit("new message", sysResult.payload);
             dispatch(updateChatLatestMessage({ chatId: activeChat.id, message: sysResult.payload }));
          }
       }
    } catch (e) { alert("Error updating role"); }
  };

  const handleRemoveUser = async (userToRemoveId) => {
    if (window.confirm("Remove user from group?")) {
      try {
         const userToRemove = activeChat.users.find(u => u.id === userToRemoveId);
         const { data } = await api.put("/chat/groupremove", { chatId: activeChat.id, userId: userToRemoveId });
         dispatch(setActiveChat(data));
         
         const sysResult = await dispatch(sendMessage({ content: `${user.name} removed ${userToRemove?.name}`, chatId: activeChat.id, type: "system" }));
         if (sysResult.payload) {
             socket.emit("new message", sysResult.payload);
             dispatch(updateChatLatestMessage({ chatId: activeChat.id, message: sysResult.payload }));
         }
      } catch (e) { alert("Error removing user"); }
    }
  };

  const handleRenameGroup = async () => {
    if (!newGroupName) return;
    try {
       const { data } = await api.put("/chat/rename", { chatId: activeChat.id, chatName: newGroupName });
       dispatch(setActiveChat(data));
       setIsRenaming(false);
       
       const sysResult = await dispatch(sendMessage({ content: `${user.name} changed the subject to "${newGroupName}"`, chatId: activeChat.id, type: "system" }));
       if (sysResult.payload) {
          socket.emit("new message", sysResult.payload);
          dispatch(updateChatLatestMessage({ chatId: activeChat.id, message: sysResult.payload }));
       }
    } catch (e) { alert("Error renaming group"); }
  };

  useEffect(() => {
    if (!userSearch.trim()) {
      setUserSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/user?search=${userSearch}`);
        setUserSearchResults(data);
      } catch (error) {}
    }, 500);
    return () => clearTimeout(timer);
  }, [userSearch]);

  const handleAddUser = async (userToAdd) => {
    if (activeMembers.find(u => u.id === userToAdd.id)) {
      alert("User already in group!");
      return;
    }
    try {
      const { data } = await api.put("/chat/groupadd", { chatId: activeChat.id, userId: userToAdd.id });
      dispatch(setActiveChat(data));
      setUserSearch("");
      setUserSearchResults([]);
      
      const sysResult = await dispatch(sendMessage({ content: `${user.name} added ${userToAdd.name}`, chatId: activeChat.id, type: "system" }));
      if (sysResult.payload) {
         socket.emit("new message", sysResult.payload);
         dispatch(updateChatLatestMessage({ chatId: activeChat.id, message: sysResult.payload }));
      }
    } catch (e) { alert("Error adding user"); }
  };

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    // Typing Indicator Logic
    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", { chatId: activeChat.id, users: activeChat.users.map(u => u.id) });
    }
    
    let lastTypingTime = new Date().getTime();
    var timerLength = 3000;
    setTimeout(() => {
      var timeNow = new Date().getTime();
      var timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", { chatId: activeChat.id, users: activeChat.users.map(u => u.id) });
        setTyping(false);
      }
    }, timerLength);
  };

  const initiateCall = async (type = "voice") => {
    if (!activeChat.isGroupChat) {
      const otherUser = activeChat.users.find((u) => u.id !== user.id);
      if (otherUser) {
        try {
          await webrtcService.createOffer(otherUser.id, user, type);
          dispatch(setActiveCall({
            id: null, // Will be updated by server/socket
            caller: user,
            receiver: otherUser,
            status: "outgoing",
            type
          }));
        } catch (err) {
          alert("Could not start call: " + err.message);
        }
      }
    } else {
      alert("Group calls are not supported yet.");
    }
  };

  const getChatName = () => {
    if (activeChat.isGroupChat) return activeChat.name;
    return activeChat.users.find((u) => u.id !== user.id)?.name || "Unknown";
  };
  
  const getChatAvatar = () => {
    if (activeChat.isGroupChat) return activeChat.avatar || "https://icon-library.com/images/group-icon-png/group-icon-png-14.jpg";
    return activeChat.users.find((u) => u.id !== user.id)?.avatar || "";
  };

  const isChatUserOnline = () => {
    if (activeChat.isGroupChat) return false;
    const otherUser = activeChat.users.find((u) => u.id !== user.id);
    return otherUser ? onlineUsers?.includes(otherUser.id) : false;
  };

  const currentUserMemberObj = activeChat?.users?.find(u => u.id === user.id)?.ConversationMember;
  const isUserAdmin = currentUserMemberObj?.role === "admin" || currentUserMemberObj?.role === "owner";
  const isUserOwner = currentUserMemberObj?.role === "owner";
  const hasLeftChat = activeChat?.isGroupChat && currentUserMemberObj && currentUserMemberObj.leftAt !== null;

  // Filter out users who have left the group for rendering active participant details
  const activeMembers = activeChat?.users?.filter(u => !u.ConversationMember?.leftAt) || [];

  if (!activeChat) {
    return (
      <div className="glass-container h-full w-full flex flex-col items-center justify-center text-slate-400">
        <div className="bg-slate-800/50 p-6 rounded-full inline-block mb-4 border border-white/5">
          <Send size={48} className="text-primary/50" />
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">Welcome to Pro-Chat</h2>
        <p>Select a chat or start a new conversation.</p>
      </div>
    );
  }

  return (
    <div className="glass-container h-full w-full flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/40 z-10">
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => dispatch(setActiveChat(null))} 
            className="p-2 -ml-2 md:hidden text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="relative">
            <img src={getChatAvatar()} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-white/10" />
            {isChatUserOnline() && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></span>
            )}
          </div>
          <div>
            <h2 className="font-semibold text-white text-lg leading-tight">{getChatName()}</h2>
            {activeChat.isGroupChat ? (
              <p className="text-xs text-slate-400 font-medium">
                 {isTyping ? <span className="text-primary italic animate-pulse">Someone is typing...</span> : `Group · ${activeMembers.length} members`}
              </p>
            ) : (
              <p className="text-xs text-slate-400 font-medium">
                 {isTyping ? <span className="text-primary italic animate-pulse">Typing...</span> : isChatUserOnline() ? <span className="text-green-400">Online</span> : <span>Offline</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
          {!activeChat.isGroupChat && (
            <>
              <button 
                onClick={() => initiateCall("video")} 
                className="p-2.5 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-primary"
                title="Video Call"
              >
                <Video size={20} />
              </button>
              <button 
                onClick={() => initiateCall("voice")} 
                className="p-2.5 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-primary"
                title="Voice Call"
              >
                <Phone size={20} />
              </button>
            </>
          )}
          <button onClick={() => setShowOptionsDropdown(!showOptionsDropdown)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300">
            <MoreVertical size={20} />
          </button>
          {showOptionsDropdown && (
             <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 rounded-xl border border-white/10 shadow-xl overflow-hidden z-50 animate-fade-in flex flex-col">
                <button onClick={() => { setShowDetailsModal(true); setShowOptionsDropdown(false); }} className="text-left px-4 py-3 hover:bg-slate-700 text-sm text-white transition-colors flex items-center gap-2">
                   <Info size={16} /> View Details
                </button>
                <button onClick={() => { handleClearChat(); setShowOptionsDropdown(false); }} className="text-left px-4 py-3 hover:bg-slate-700 text-sm text-yellow-400 transition-colors flex items-center gap-2">
                   <Trash2 size={16} /> Clear Chat
                </button>
                <button onClick={() => { handleDeleteChat(); setShowOptionsDropdown(false); }} className="text-left px-4 py-3 hover:bg-slate-700 text-sm text-red-400 transition-colors border-t border-white/5 flex items-center gap-2">
                   {activeChat.isGroupChat ? (hasLeftChat ? <><Trash size={16} /> Delete Chat Options</> : <><LogOut size={16} /> Leave Group</>) : <><Trash size={16} /> Delete Chat</>}
                </button>
             </div>
          )}
        </div>
      </div>

      {/* Details Modal Overlay */}
      {showDetailsModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in p-6">
           <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b border-white/5">
                 <h2 className="font-semibold text-lg">{activeChat.isGroupChat ? "Group Info" : "User Info"}</h2>
                 <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
              </div>
              <div className="p-6 flex flex-col items-center">
                 <img src={getChatAvatar()} alt="avatar" className="w-24 h-24 rounded-full object-cover border-4 border-slate-700 mb-4" />
                 
                 {isRenaming ? (
                    <div className="flex gap-2 w-full mb-1">
                       <input 
                         type="text" 
                         value={newGroupName} 
                         onChange={(e) => setNewGroupName(e.target.value)} 
                         className="flex-1 bg-slate-900 border border-white/20 rounded p-1 text-white text-center" 
                         autoFocus
                       />
                       <button onClick={handleRenameGroup} className="text-green-500"><Check size={20}/></button>
                       <button onClick={() => setIsRenaming(false)} className="text-slate-500"><X size={20}/></button>
                    </div>
                 ) : (
                    <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                       {getChatName()}
                       {activeChat.isGroupChat && isUserAdmin && (
                          <button onClick={() => { setIsRenaming(true); setNewGroupName(activeChat.name); }} className="text-slate-500 hover:text-white"><Edit2 size={16}/></button>
                       )}
                    </h3>
                 )}

                 {!activeChat.isGroupChat && <p className="text-slate-400 mb-4">{activeChat.users.find((u) => u.id !== user.id)?.email}</p>}
                 
                 {activeChat.isGroupChat && (
                    <div className="w-full mt-6">
                       <div className="flex justify-between items-center mb-3">
                         <p className="text-sm font-semibold text-primary">{activeMembers.length} Participants</p>
                       </div>

                       {activeChat.isGroupChat && isUserAdmin && !hasLeftChat && (
                          <div className="mb-4 relative">
                             <input 
                               type="text" 
                               placeholder="Add members (search names or emails)" 
                               value={userSearch}
                               onChange={(e) => setUserSearch(e.target.value)}
                               className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary"
                             />
                             {userSearchResults.length > 0 && (
                                <div className="absolute top-full left-0 w-full bg-slate-800 border border-white/10 rounded-lg shadow-xl mt-1 z-50 max-h-48 overflow-y-auto">
                                   {userSearchResults.map(u => (
                                      <div key={u.id} onClick={() => handleAddUser(u)} className="flex items-center gap-2 p-2 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0">
                                         <img src={u.avatar} alt="avatar" className="w-8 h-8 rounded-full" />
                                         <p className="text-sm flex-1">{u.name}</p>
                                         <Plus size={16} className="text-primary" />
                                      </div>
                                   ))}
                                </div>
                             )}
                          </div>
                       )}

                       <div className="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                          {activeMembers.sort((a,b) => {
                             const roles = { owner: 0, admin: 1, member: 2 };
                             return roles[a.ConversationMember?.role || 'member'] - roles[b.ConversationMember?.role || 'member'];
                          }).map(u => (
                             <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors group/member">
                                <img src={u.avatar} alt="avatar" className="w-10 h-10 rounded-full" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                       <p className="text-sm font-medium text-white">{u.name} {u.id === user.id ? "(You)" : ""}</p>
                                       {u.ConversationMember?.role === "owner" && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold italic"><Crown size={10}/> OWNER</span>}
                                       {u.ConversationMember?.role === "admin" && <span className="text-[10px] bg-sky-500/20 text-sky-500 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold italic"><ShieldCheck size={10}/> ADMIN</span>}
                                    </div>
                                    <p className="text-[10px] text-slate-500">
                                       {u.ConversationMember?.createdAt && `Joined ${new Date(u.ConversationMember.createdAt).toLocaleDateString()}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover/member:opacity-100 transition-opacity">
                                    {isUserAdmin && u.id !== user.id && (
                                       <>
                                          {/* Promotion actions */}
                                          {isUserOwner && u.ConversationMember?.role === "member" && (
                                             <button onClick={() => handleUpdateRole(u.id, "admin")} title="Promote to Admin" className="p-1.5 text-sky-400 hover:bg-sky-400/10 rounded-full transition-transform hover:scale-110"><UserCheck size={16}/></button>
                                          )}
                                          {isUserOwner && u.ConversationMember?.role === "admin" && (
                                             <button onClick={() => handleUpdateRole(u.id, "member")} title="Dismiss as Admin" className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-full transition-transform hover:scale-110"><UserX size={16}/></button>
                                          )}
                                          
                                          {/* Deletion actions */}
                                          {(isUserOwner || (isUserAdmin && u.ConversationMember?.role === "member")) && (
                                             <button onClick={() => handleRemoveUser(u.id)} title="Remove Member" className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-full transition-transform hover:scale-110"><UserMinus size={16}/></button>
                                          )}
                                       </>
                                    )}
                                 </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Message Info Overlay */}
      {showMessageDetails && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in p-6">
           <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b border-white/5">
                 <h2 className="font-semibold text-lg text-white">Message Info</h2>
                 <button onClick={() => setShowMessageDetails(null)} className="text-slate-400 hover:text-white"><X size={20}/></button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {activeChat.isGroupChat ? (
                   <>
                     <div className="mb-6">
                        <h3 className="text-xs text-sky-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-1"><CheckCheck size={14}/> Read by</h3>
                        <div className="flex flex-col gap-3">
                           {activeMembers.filter(u => u.id !== user.id && showMessageDetails.readBy?.includes(u.id)).length > 0 ? (
                              activeMembers.filter(u => u.id !== user.id && showMessageDetails.readBy?.includes(u.id)).map(u => (
                                 <div key={u.id} className="flex items-center gap-3">
                                    <img src={u.avatar} alt="avatar" className="w-8 h-8 rounded-full border border-white/5" />
                                    <span className="text-sm font-medium text-slate-200">{u.name}</span>
                                 </div>
                              ))
                           ) : (
                              <p className="text-sm text-slate-500 italic ml-1">No one has read this yet</p>
                           )}
                        </div>
                     </div>
                     <div>
                        <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-1"><CheckCheck size={14}/> Delivered to</h3>
                        <div className="flex flex-col gap-3">
                           {activeMembers.filter(u => u.id !== user.id && !showMessageDetails.readBy?.includes(u.id)).length > 0 ? (
                              activeMembers.filter(u => u.id !== user.id && !showMessageDetails.readBy?.includes(u.id)).map(u => (
                                 <div key={u.id} className="flex items-center gap-3 opacity-70">
                                    <img src={u.avatar} alt="avatar" className="w-8 h-8 rounded-full border border-white/5" />
                                    <span className="text-sm font-medium text-slate-300">{u.name}</span>
                                 </div>
                              ))
                           ) : (
                              <p className="text-sm text-slate-500 italic ml-1">Delivered to everyone</p>
                           )}
                        </div>
                     </div>
                   </>
                ) : (
                   <div className="text-center py-6">
                     {showMessageDetails.status === "read" ? (
                        <>
                           <CheckCheck size={56} className="text-sky-400 mx-auto mb-3" />
                           <p className="font-semibold text-lg text-slate-200">Read</p>
                        </>
                     ) : showMessageDetails.status === "delivered" ? (
                        <>
                           <CheckCheck size={56} className="text-slate-400 mx-auto mb-3" />
                           <p className="font-semibold text-lg text-slate-200">Delivered</p>
                        </>
                     ) : (
                        <>
                           <Check size={56} className="text-slate-400 mx-auto mb-3" />
                           <p className="font-semibold text-lg text-slate-200">Sent</p>
                        </>
                     )}
                   </div>
                )}
              </div>
           </div>
        </div>
      )}

      {/* Messages View */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-10">
        {isLoading ? (
          <div className="flex justify-center items-center h-full text-primary">
            <Loader2 size={32} className="animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
             {messages.map((m, i) => {
               const isOwnMsg = m.senderId === user.id;
               
               // Show group member names if group chat
               const renderSenderName = activeChat.isGroupChat && !isOwnMsg && 
                 (i === 0 || messages[i-1].senderId !== m.senderId);

               return (
                 <div key={m.id} className={`flex ${m.type === "system" ? "w-full justify-center" : "group " + (isOwnMsg ? "justify-end" : "justify-start")} animate-fade-in`}>
                   {m.type === "system" ? (
                      <div className="w-full flex justify-center my-1">
                         <span className="bg-slate-800/80 backdrop-blur-sm text-slate-300 text-[11px] px-4 py-1 rounded-full border border-white/5 shadow-sm text-center">
                            {m.content}
                         </span>
                      </div>
                   ) : (
                     <>
                       {!isOwnMsg && (
                          <img 
                            src={m.sender?.avatar} 
                            className="w-8 h-8 rounded-full border border-white/10 mr-2 mt-auto" 
                            alt="sender"
                          />
                       )}
                       <div className={`max-w-[70%] flex gap-2 relative ${isOwnMsg ? "items-end flex-row-reverse" : "items-start"}`}>
                         {renderSenderName && <div className="text-xs text-primary font-medium mb-1 ml-1 self-start">{m.sender?.name}</div>}
                         
                         {/* Edit/React Actions */}
                         <div className={`absolute top-[40%] -translate-y-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 flex gap-1 items-center transition-opacity z-10 ${isOwnMsg ? "right-full mr-2 flex-row-reverse" : "left-full ml-2"}`}>
                           {isOwnMsg && !m.isDeleted && (
                              <button onClick={() => { setEditingMessage(m); setNewMessage(m.content); }} className="p-1.5 bg-slate-800 border border-white/10 rounded-full text-slate-400 hover:text-indigo-400 hover:bg-slate-700 shadow-md" title="Edit Message">
                                 <Edit2 size={13} />
                              </button>
                           )}
                           {isOwnMsg && !m.isDeleted && (
                              <button onClick={() => setShowMessageDetails(m)} className="p-1.5 bg-slate-800 border border-white/10 rounded-full text-slate-400 hover:text-sky-400 hover:bg-slate-700 shadow-md" title="Message Info">
                                 <Info size={13} />
                              </button>
                           )}
                           {!m.isDeleted && (
                              <>
                                 <div className="relative group/delete">
                                   <button onClick={() => handleDeleteMessage(m.id, "me")} className="p-1.5 bg-slate-800 border border-white/10 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-700 shadow-md" title="Delete for me"><Trash size={13} /></button>
                                 </div>
                                 {isOwnMsg && <button onClick={() => handleDeleteMessage(m.id, "everyone")} className="p-1.5 bg-slate-800 border border-white/10 rounded-full text-slate-400 hover:text-red-600 hover:bg-slate-700 shadow-md" title="Delete for everyone"><Trash2 size={13} /></button>}
                                 <div className="relative">
                                   <button onClick={() => setShowReactions(showReactions === m.id ? null : m.id)} className="p-1.5 bg-slate-800 border border-white/10 rounded-full text-slate-400 hover:text-yellow-400 hover:bg-slate-700 shadow-md" title="React"><Smile size={13} /></button>
                                   {showReactions === m.id && (
                                      <div className="absolute bottom-full right-0 mb-2 bg-slate-800 rounded-full border border-white/10 px-3 py-2 flex gap-3 z-20 shadow-xl pointer-events-auto">
                                         {['👍','❤️','😂','😮','😢'].map(emoji => (
                                            <button key={emoji} onClick={() => handleReactToMessage(m.id, emoji)} className="hover:scale-125 transition-transform text-xl leading-none">{emoji}</button>
                                         ))}
                                      </div>
                                   )}
                                 </div>
                              </>
                           )}
                         </div>

                         <div className="flex flex-col">
                           <div className={`px-4 py-2 rounded-2xl relative ${
                              isOwnMsg 
                                ? "bg-primary text-white rounded-br-sm shadow-md" 
                                : "bg-slate-800 text-slate-200 rounded-bl-sm border border-white/5 shadow-md"
                           }`}>
                             <p className={`text-sm ${m.isDeleted ? "italic opacity-70" : ""}`}>{m.content}</p>
                             <span className={`text-[10px] block mt-1 flex items-center justify-end ${isOwnMsg ? "text-indigo-200" : "text-slate-400"}`}>
                                {m.isEdited && !m.isDeleted && <span className="mr-1 italic opacity-75">edited</span>}
                                {new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                {isOwnMsg && (
                                  <span className="ml-1 flex items-center">
                                    {m.status === "sending" && <Clock size={12} className="text-white/70" />}
                                    
                                    {activeChat.isGroupChat ? (
                                       m.readBy?.filter(id => activeMembers.some(u => u.id === id)).length >= activeMembers.length - 1 ? (
                                         <CheckCheck size={14} className="text-sky-300" title="Read by all" />
                                       ) : m.status === "delivered" || m.readBy?.length > 0 ? (
                                         <CheckCheck size={14} className="text-white/70" title="Delivered" />
                                       ) : m.status === "sent" ? (
                                         <Check size={14} className="text-white/70" title="Sent" />
                                       ) : null
                                    ) : (
                                       <>
                                          {m.status === "sent" && <Check size={14} className="text-white/70" title="Sent" />}
                                          {m.status === "delivered" && <CheckCheck size={14} className="text-white/70" title="Delivered" />}
                                          {m.status === "read" && <CheckCheck size={14} className="text-sky-300" title="Read" />}
                                       </>
                                    )}
                                  </span>
                                )}
                             </span>
                           </div>
                           
                           {/* Reaction Badges */}
                           {m.reactions && Object.keys(m.reactions).length > 0 && (
                             <div className={`flex gap-1 mt-0.5 z-10 -translate-y-2 ${isOwnMsg ? "justify-end mr-2" : "justify-start ml-2"}`}>
                               {Object.entries(m.reactions).map(([emoji, usersArr]) => (
                                 <span key={emoji} onClick={() => handleReactToMessage(m.id, emoji)} className="bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors rounded-full px-1.5 py-[1px] text-[11px] cursor-pointer shadow-sm">
                                   {emoji} {usersArr.length > 1 ? <span className="text-slate-400 ml-0.5">{usersArr.length}</span> : ""}
                                 </span>
                               ))}
                             </div>
                           )}
                         </div>
                       </div>
                     </>
                   )}
                 </div>
               )
             })}
             {/* Removed typing indicator from messages list as requested */}
             <div ref={scrollRef}></div>
          </div>
        )}
      </div>

      {/* Input Area */}
      {!hasLeftChat ? (
         <div className="p-4 border-t border-white/10 bg-slate-900/60 z-10">
           <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
             <button type="button" className="p-2 text-slate-400 hover:text-white transition-colors">
                <Smile size={24} />
             </button>
             <button type="button" className="p-2 text-slate-400 hover:text-white transition-colors">
                <Paperclip size={24} />
             </button>
             
             <input
               type="text"
               className="flex-1 bg-slate-900/50 border border-white/10 rounded-full px-5 py-3 text-white focus:outline-none focus:border-primary transition-colors"
               placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
               value={newMessage}
               onChange={typingHandler}
             />
             
             {editingMessage && (
                <button type="button" onClick={() => { setEditingMessage(null); setNewMessage(""); }} className="p-2 text-slate-400 hover:text-red-400 transition-colors">
                   <X size={20} />
                </button>
             )}

             <button 
               type="submit" 
               disabled={!newMessage.trim()}
               className={`p-3 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${editingMessage ? "bg-indigo-500 hover:bg-indigo-600" : "bg-primary hover:bg-primary-hover"}`}
             >
               <Send size={20} className="ml-0.5" />
             </button>
           </form>
         </div>
      ) : (
         <div className="p-4 border-t border-white/10 bg-slate-900/60 z-10 text-center">
            <p className="text-slate-400 text-sm italic">
               {currentUserMemberObj?.leftReason === "removed" 
                 ? "You were removed from this group by an admin." 
                 : "You have left this group and can no longer participate."}
            </p>
         </div>
      )}
    </div>
  );
};

export default ChatWindow;
