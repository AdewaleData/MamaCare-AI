import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi, Message, Conversation } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useChatWebSocket } from '../hooks/useChatWebSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { 
  Send, 
  Loader2, 
  MessageCircle, 
  X, 
  ChevronLeft, 
  Plus, 
  Search, 
  User,
  Check,
  CheckCheck,
  MoreVertical,
  Phone,
  Video,
  PhoneOff,
  VideoOff,
  Mic,
  MicOff
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ChatProps {
  otherUserId?: string;
  onClose?: () => void;
  showConversationList?: boolean;
}

export default function Chat({ otherUserId: initialOtherUserId, onClose, showConversationList = true }: ChatProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialOtherUserId || null);
  const [messageText, setMessageText] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [incomingCall, setIncomingCall] = useState<{ from_user_id: string; from_user_name: string; call_type: 'audio' | 'video' } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const token = localStorage.getItem('access_token');

  // Get conversations list
  const { data: conversationsData, isLoading: conversationsLoading, error: conversationsError } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: async () => {
      try {
        console.log('[Chat] Fetching conversations...');
        const result = await chatApi.getConversations();
        console.log('[Chat] Conversations response:', result);
        return result;
      } catch (error: any) {
        console.error('[Chat] Error fetching conversations:', error);
        console.error('[Chat] Error response:', error.response?.data);
        console.error('[Chat] Error message:', error.message);
        throw error;
      }
    },
    enabled: showConversationList,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2,
  });

  // Debug logging
  useEffect(() => {
    console.log('[Chat] Conversations data:', conversationsData);
    console.log('[Chat] Conversations loading:', conversationsLoading);
    console.log('[Chat] Conversations error:', conversationsError);
    if (conversationsData) {
      console.log('[Chat] Number of conversations:', conversationsData.conversations?.length || 0);
    }
    if (conversationsError) {
      console.error('[Chat] Full error object:', conversationsError);
    }
  }, [conversationsData, conversationsLoading, conversationsError]);

  // Get online users
  const { data: onlineUsersData } = useQuery({
    queryKey: ['chat', 'online-users'],
    queryFn: () => chatApi.getOnlineUsers(),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const onlineUserIds = onlineUsersData?.online_user_ids || [];

  // Only show new chat if no conversations exist
  useEffect(() => {
    if (!conversationsLoading && conversationsData) {
      if (conversationsData.conversations.length === 0) {
        setShowNewChat(true);
      } else {
        setShowNewChat(false);
      }
    }
  }, [conversationsLoading, conversationsData]);

  // Get available users to chat with
  const { data: availableUsersData, isLoading: availableUsersLoading, error: availableUsersError } = useQuery({
    queryKey: ['chat', 'available-users'],
    queryFn: () => chatApi.getAvailableUsers(),
    enabled: showNewChat,
    retry: 2,
  });

  // Get messages for selected conversation
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['chat', 'messages', selectedUserId],
    queryFn: () => chatApi.getConversation(selectedUserId!),
    enabled: !!selectedUserId,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage({
      receiver_id: selectedUserId!,
      content,
    }),
    onSuccess: () => {
      setMessageText('');
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });

  // WebSocket for real-time messages and call signaling
  const { isConnected, lastMessage, sendMessage: sendWebSocketMessage } = useChatWebSocket(token, (message) => {
    if (message.type === 'chat_message') {
      const newMessage = message.message as Message;
      // If this message is for the current conversation, refetch
      if (selectedUserId && (newMessage.sender_id === selectedUserId || newMessage.receiver_id === selectedUserId)) {
        refetchMessages();
      }
      // Always invalidate conversations to update unread counts
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    } else if (message.type === 'incoming_call') {
      // Handle incoming call
      setIncomingCall({
        from_user_id: message.from_user_id,
        from_user_name: message.from_user_name,
        call_type: message.call_type || 'audio'
      });
    } else if (message.type === 'call_offer') {
      // Handle incoming WebRTC offer
      if (webRTCRef.current?.handleOffer && message.offer) {
        const callType = message.call_type || 'video';
        // If we have an incoming call dialog, close it
        if (incomingCall && incomingCall.from_user_id === message.from_user_id) {
          setIncomingCall(null);
        }
        webRTCRef.current.handleOffer(message.offer, callType === 'video');
      }
    } else if (message.type === 'call_answer') {
      // Handle incoming WebRTC answer
      if (webRTCRef.current?.handleAnswer) {
        webRTCRef.current.handleAnswer(message.answer);
      }
    } else if (message.type === 'call_ice-candidate') {
      // Handle incoming ICE candidate
      if (webRTCRef.current?.handleIceCandidate) {
        webRTCRef.current.handleIceCandidate(message.candidate);
      }
    } else if (message.type === 'call_hangup') {
      // Handle call hangup
      if (webRTCRef.current) {
        webRTCRef.current.endCall();
      }
      setIncomingCall(null);
    } else if (message.type === 'call_rejected') {
      // Handle call rejection
      if (webRTCRef.current && webRTCRef.current.callState === 'calling') {
        webRTCRef.current.endCall();
        alert('Call was rejected');
      }
    }
  });

  // WebRTC hook - use ref to access in WebSocket callback
  const webRTCRef = useRef<any>(null);
  const webRTC = useWebRTC({
    localVideoRef,
    remoteVideoRef,
    onCallStateChange: (state) => {
      if (state === 'ended') {
        setIncomingCall(null);
      }
    },
    sendSignalingMessage: (message) => {
      if (selectedUserId && sendWebSocketMessage) {
        sendWebSocketMessage({
          ...message,
          target_user_id: selectedUserId
        });
      }
    }
  });
  webRTCRef.current = webRTC;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedUserId) return;
    sendMessageMutation.mutate(messageText.trim());
  };

  const selectedConversation = conversationsData?.conversations.find(
    (conv) => conv.other_user_id === selectedUserId
  );

  // Determine patient name to display
  const getPatientName = () => {
    if (!selectedConversation) return null;
    
    // If current user is a provider, the other user is the patient
    if (user?.role === 'provider') {
      return selectedConversation.other_user_role === 'patient' 
        ? selectedConversation.other_user_name 
        : null;
    }
    
    // If current user is a patient, show their own name
    if (user?.role === 'patient') {
      return user.full_name;
    }
    
    // For other roles, show the other user's name if they're a patient
    return selectedConversation.other_user_role === 'patient' 
      ? selectedConversation.other_user_name 
      : null;
  };

  const patientName = getPatientName();

  // Filter available users by search query
  const filteredAvailableUsers = React.useMemo(() => {
    if (!availableUsersData?.users) return [];
    return availableUsersData.users.filter((user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableUsersData, searchQuery]);

  const handleStartChat = (userId: string) => {
    setSelectedUserId(userId);
    setShowNewChat(false);
    setSearchQuery('');
    queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
  };

  const isUserOnline = (userId: string) => {
    return onlineUserIds.includes(userId);
  };

  // Single conversation view (no list)
  if (!showConversationList && selectedUserId) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-white via-gray-50 to-primary-50/30 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg">
          <div className="flex items-center space-x-3">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-primary-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-semibold">
              {selectedConversation?.other_user_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">
                {selectedConversation?.other_user_name || 'Chat'}
              </h3>
              <p className="text-xs text-primary-100 flex items-center mt-1">
                {isUserOnline(selectedUserId) ? (
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-green-300 rounded-full mr-1.5 animate-pulse"></span>
                    Online
                  </span>
                ) : (
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-1.5"></span>
                    Offline
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 relative"
          style={{ 
            background: `
              linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 25%, #f0fdfa 50%, #ecfeff 75%, #f0f9ff 100%),
              radial-gradient(circle at 10% 20%, rgba(14, 165, 233, 0.2) 0%, transparent 40%),
              radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.2) 0%, transparent 40%),
              radial-gradient(circle at 50% 50%, rgba(147, 197, 253, 0.15) 0%, transparent 50%)
            `,
            backgroundSize: '100% 100%, 60% 60%, 50% 50%, 40% 40%',
            backgroundPosition: '0% 0%, 0% 0%, 100% 100%, 50% 50%',
            backgroundAttachment: 'fixed',
            backgroundBlendMode: 'normal, overlay, overlay, overlay'
          }}
        >
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : messages && messages.length > 0 ? (
            messages.map((message) => {
              const isOwn = message.sender_id === user?.id;
              const messageDate = new Date(message.created_at);
              const isToday = format(messageDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              
              return (
                <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                  <div className={`flex items-end space-x-2 max-w-[70%] ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {!isOwn && (
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mb-1 shadow-md">
                        {message.sender_name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className={`relative ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div
                        className={`px-4 py-3 rounded-2xl shadow-md transition-all duration-200 ${
                          isOwn
                            ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-br-sm'
                            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm shadow-sm'
                        }`}
                      >
                        {!isOwn && (
                          <p className="text-xs font-semibold mb-1.5 opacity-90">
                            {message.sender_name}
                          </p>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <div className={`flex items-center justify-end mt-1.5 space-x-1 ${isOwn ? 'text-primary-100' : 'text-gray-500'}`}>
                          <span className="text-xs">
                            {isToday 
                              ? format(messageDate, 'h:mm a')
                              : format(messageDate, 'MMM d, h:mm a')}
                          </span>
                          {isOwn && (
                            <span className="ml-1">
                              {message.is_read ? (
                                <CheckCheck className="h-3.5 w-3.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-10 w-10 text-primary-600" />
                </div>
                <p className="text-lg font-medium text-gray-700">No messages yet</p>
                <p className="text-sm text-gray-500 mt-1">Start the conversation!</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 shadow-lg">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none transition-all bg-gray-50 focus:bg-white"
                disabled={sendMessageMutation.isPending}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              className="p-3 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-2xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none flex items-center justify-center"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Full chat view with conversation list
  return (
    <div className="flex h-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
      {/* Conversation List - Always Visible */}
      {showConversationList && (
        <div className="w-96 border-r border-gray-200 flex flex-col bg-gradient-to-b from-white to-gray-50/50">
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">MamaCare Chat</h2>
                <p className="text-sm text-primary-100 mt-0.5">Secure healthcare messaging</p>
              </div>
              <div className="flex items-center space-x-2">
                {/* Small New Chat button when conversations exist */}
                {conversationsData && conversationsData.conversations.length > 0 && (
                  <button
                    onClick={() => {
                      setShowNewChat(!showNewChat);
                      setSelectedUserId(null); // Clear selection when starting new chat
                    }}
                    className="p-2 hover:bg-primary-800 rounded-lg transition-colors"
                    title="Start New Chat"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                )}
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-primary-800 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
            
            {/* New Chat Button - Only show if no conversations exist */}
            {(!conversationsData || conversationsData.conversations.length === 0) && (
              <button
                onClick={() => setShowNewChat(!showNewChat)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/30"
              >
                <Plus className="h-5 w-5" />
                <span className="font-semibold">New Chat</span>
              </button>
            )}
          </div>

          {/* New Chat - Available Users - Toggleable */}
          {showNewChat && (
            <div className="border-b border-gray-200 bg-white shadow-sm max-h-64 overflow-hidden flex flex-col">
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-gray-50 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {availableUsersLoading ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                  </div>
                ) : availableUsersError ? (
                  <div className="p-4 text-center">
                    <p className="text-red-600 text-sm mb-2">Error loading users</p>
                    <button
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['chat', 'available-users'] })}
                      className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs hover:bg-primary-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredAvailableUsers.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {filteredAvailableUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleStartChat(user.id)}
                        className="w-full p-3 text-left hover:bg-primary-50 transition-colors flex items-center space-x-3 group relative"
                      >
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md group-hover:shadow-lg transition-shadow">
                            {user.name.charAt(0)}
                          </div>
                          {isUserOnline(user.id) && (
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{user.name}</h4>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full capitalize">
                            {user.role}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    {searchQuery ? (
                      'No users found matching your search'
                    ) : (
                      <div>
                        <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No users available to chat with</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Make sure you have an assigned provider or patients
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conversations List - Always Visible Below New Chat */}
          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            ) : conversationsError ? (
              <div className="flex items-center justify-center h-full p-6">
                <div className="text-center max-w-sm">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-red-600 text-sm mb-2 font-semibold">Error loading conversations</p>
                  <p className="text-xs text-gray-500 mb-4">
                    {(conversationsError as any)?.response?.data?.detail || 
                     (conversationsError as any)?.message || 
                     'Unable to load your conversations. Please try again.'}
                  </p>
                  <button
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors font-semibold shadow-md"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : conversationsData?.conversations && conversationsData.conversations.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {conversationsData.conversations.map((conversation) => {
                  const isSelected = selectedUserId === conversation.other_user_id;
                  const lastMessageTime = conversation.last_message 
                    ? new Date(conversation.last_message.created_at)
                    : null;
                  const isOnline = isUserOnline(conversation.other_user_id);
                  
                  return (
                    <button
                      key={conversation.other_user_id}
                      onClick={() => {
                        setSelectedUserId(conversation.other_user_id);
                        setShowNewChat(false); // Close new chat panel when selecting a conversation
                      }}
                      className={`w-full p-4 text-left transition-all duration-200 ${
                        isSelected
                          ? 'bg-gradient-to-r from-primary-50 to-primary-100/50 border-l-4 border-primary-600 shadow-sm'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="relative flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shadow-md ${
                            isSelected 
                              ? 'bg-gradient-to-br from-primary-500 to-primary-700' 
                              : 'bg-gradient-to-br from-gray-400 to-gray-600'
                          }`}>
                            {conversation.other_user_name.charAt(0)}
                          </div>
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full animate-pulse"></span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className={`font-semibold truncate ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}>
                              {conversation.other_user_name}
                            </h3>
                            {lastMessageTime && (
                              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                {formatDistanceToNow(lastMessageTime, { addSuffix: true })}
                              </span>
                            )}
                          </div>
                          {conversation.last_message ? (
                            <p className={`text-sm truncate ${isSelected ? 'text-primary-700' : 'text-gray-600'}`}>
                              {conversation.last_message.content}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No messages yet</p>
                          )}
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                conversation.other_user_role === 'provider'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {conversation.other_user_role}
                              </span>
                              {isOnline && (
                                <span className="text-xs text-green-600 flex items-center">
                                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                  Online
                                </span>
                              )}
                            </div>
                            {conversation.unread_count > 0 && (
                              <span className="bg-primary-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                {conversation.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 p-6">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-10 w-10 text-primary-600" />
                  </div>
                  <p className="text-sm mb-4 font-medium">No conversations yet</p>
                  {!showNewChat && (
                    <button
                      onClick={() => setShowNewChat(true)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-semibold shadow-md"
                    >
                      Start New Chat
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Beautiful Background Pattern */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: `
              linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 25%, #f0fdfa 50%, #ecfeff 75%, #f0f9ff 100%),
              radial-gradient(circle at 10% 20%, rgba(14, 165, 233, 0.2) 0%, transparent 40%),
              radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.2) 0%, transparent 40%),
              radial-gradient(circle at 50% 50%, rgba(147, 197, 253, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 30% 70%, rgba(219, 234, 254, 0.2) 0%, transparent 40%),
              radial-gradient(circle at 70% 30%, rgba(186, 230, 253, 0.15) 0%, transparent 40%)
            `,
            backgroundSize: '100% 100%, 60% 60%, 50% 50%, 40% 40%, 45% 45%, 55% 55%',
            backgroundPosition: '0% 0%, 0% 0%, 100% 100%, 50% 50%, 30% 70%, 70% 30%',
            backgroundAttachment: 'fixed',
            backgroundBlendMode: 'normal, overlay, overlay, overlay, overlay, overlay'
          }}
        ></div>
        
        {/* Additional decorative elements */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230ea5e9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundAttachment: 'fixed'
          }}
        ></div>

        {selectedUserId ? (
          <>
            {/* Header */}
            <div className="relative z-10 flex items-center justify-between p-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-semibold text-lg shadow-md">
                    {selectedConversation?.other_user_name?.charAt(0) || 'U'}
                  </div>
                  {isUserOnline(selectedUserId) && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-300 border-2 border-primary-700 rounded-full animate-pulse"></span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white text-xl">
                    {selectedConversation?.other_user_name || 'Chat'}
                  </h3>
                  <p className="text-xs text-primary-100 flex items-center mt-1">
                    {isUserOnline(selectedUserId) ? (
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-green-300 rounded-full mr-1.5 animate-pulse"></span>
                        Online
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-1.5"></span>
                        Offline
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {webRTC.callState === 'idle' || webRTC.callState === 'ended' ? (
                  <>
                    <button
                      onClick={async () => {
                        if (selectedUserId) {
                          try {
                            await webRTC.startCall(false, true);
                            // Offer is sent automatically by startCall via sendSignalingMessage
                          } catch (error) {
                            console.error('Error starting audio call:', error);
                          }
                        }
                      }}
                      className="p-2 hover:bg-primary-800 rounded-lg transition-colors"
                      title="Audio Call"
                    >
                      <Phone className="h-5 w-5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (selectedUserId) {
                          try {
                            await webRTC.startCall(true, true);
                            // Offer is sent automatically by startCall via sendSignalingMessage
                          } catch (error) {
                            console.error('Error starting video call:', error);
                          }
                        }
                      }}
                      className="p-2 hover:bg-primary-800 rounded-lg transition-colors"
                      title="Video Call"
                    >
                      <Video className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={webRTC.toggleAudio}
                      className={`p-2 rounded-lg transition-colors ${
                        webRTC.isAudioEnabled ? 'hover:bg-primary-800' : 'bg-red-600 hover:bg-red-700'
                      }`}
                      title={webRTC.isAudioEnabled ? 'Mute' : 'Unmute'}
                    >
                      {webRTC.isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </button>
                    {webRTC.callState === 'connected' && (
                      <button
                        onClick={webRTC.toggleVideo}
                        className={`p-2 rounded-lg transition-colors ${
                          webRTC.isVideoEnabled ? 'hover:bg-primary-800' : 'bg-red-600 hover:bg-red-700'
                        }`}
                        title={webRTC.isVideoEnabled ? 'Turn off video' : 'Turn on video'}
                      >
                        {webRTC.isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                      </button>
                    )}
                    <button
                      onClick={webRTC.endCall}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      title="End Call"
                    >
                      <PhoneOff className="h-5 w-5" />
                    </button>
                  </>
                )}
                <button className="p-2 hover:bg-primary-800 rounded-lg transition-colors">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="relative z-10 flex-1 overflow-y-auto p-6 space-y-4"
            >
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
              ) : messages && messages.length > 0 ? (
                messages.map((message, index) => {
                  const isOwn = message.sender_id === user?.id;
                  const messageDate = new Date(message.created_at);
                  const isToday = format(messageDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  const prevMessage = index > 0 ? messages[index - 1] : null;
                  const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id;
                  const showTime = !prevMessage || 
                    Math.abs(new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime()) > 300000; // 5 minutes
                  
                  return (
                    <React.Fragment key={message.id}>
                      {showTime && (
                        <div className="flex justify-center my-4">
                          <span className="px-3 py-1 bg-white/80 backdrop-blur-sm text-gray-600 text-xs rounded-full shadow-sm border border-gray-200">
                            {isToday 
                              ? `Today, ${format(messageDate, 'h:mm a')}`
                              : format(messageDate, 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                        <div className={`flex items-end space-x-2 max-w-[75%] ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          {!isOwn && showAvatar && (
                            <div className="relative">
                              <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mb-1 shadow-md">
                                {message.sender_name?.charAt(0) || 'U'}
                              </div>
                              {isUserOnline(message.sender_id) && (
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                              )}
                            </div>
                          )}
                          {!isOwn && !showAvatar && <div className="w-9 flex-shrink-0" />}
                          <div className={`relative flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl ${
                                isOwn
                                  ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-br-sm'
                                  : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                              }`}
                            >
                              {!isOwn && showAvatar && (
                                <p className="text-xs font-semibold mb-1.5 opacity-90">
                                  {message.sender_name}
                                </p>
                              )}
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                              <div className={`flex items-center justify-end mt-1.5 space-x-1.5 ${isOwn ? 'text-primary-100' : 'text-gray-500'}`}>
                                <span className="text-xs">
                                  {format(messageDate, 'h:mm a')}
                                </span>
                                {isOwn && (
                                  <span className="ml-0.5">
                                    {message.is_read ? (
                                      <CheckCheck className="h-3.5 w-3.5" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <MessageCircle className="h-10 w-10 text-primary-600" />
                    </div>
                    <p className="text-lg font-medium text-gray-700">No messages yet</p>
                    <p className="text-sm text-gray-500 mt-1">Start the conversation!</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="relative z-10 p-4 bg-white border-t border-gray-200 shadow-lg">
              <div className="flex items-end space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      // Auto-resize textarea
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none transition-all bg-gray-50 focus:bg-white placeholder:text-gray-400"
                    disabled={sendMessageMutation.isPending}
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
                  className="p-3 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-2xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none flex items-center justify-center"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </form>

            {/* Call UI Overlay */}
            {(webRTC.callState === 'calling' || webRTC.callState === 'ringing' || webRTC.callState === 'connected') && (
              <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center">
                <div className="w-full h-full flex flex-col">
                  {/* Remote Video */}
                  <div className="flex-1 relative bg-gray-900">
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {webRTC.callState === 'calling' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="text-center text-white">
                          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                          <p className="text-lg">Calling...</p>
                        </div>
                      </div>
                    )}
                    {webRTC.callState === 'ringing' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="text-center text-white">
                          <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Phone className="h-12 w-12" />
                          </div>
                          <p className="text-xl font-semibold mb-2">Incoming Call</p>
                          <p className="text-gray-300">{selectedConversation?.other_user_name}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Local Video (Picture-in-Picture) */}
                  {webRTC.isVideoEnabled && webRTC.callState === 'connected' && (
                    <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-xl">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Call Controls */}
                  <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
                    <button
                      onClick={webRTC.toggleAudio}
                      className={`p-4 rounded-full transition-colors ${
                        webRTC.isAudioEnabled
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {webRTC.isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                    </button>
                    {webRTC.callState === 'connected' && (
                      <button
                        onClick={webRTC.toggleVideo}
                        className={`p-4 rounded-full transition-colors ${
                          webRTC.isVideoEnabled
                            ? 'bg-gray-700 hover:bg-gray-600 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        {webRTC.isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                      </button>
                    )}
                    <button
                      onClick={webRTC.endCall}
                      className="p-4 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors"
                    >
                      <PhoneOff className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Incoming Call Dialog */}
            {incomingCall && webRTC.callState === 'idle' && (
              <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      {incomingCall.call_type === 'video' ? (
                        <Video className="h-12 w-12 text-white" />
                      ) : (
                        <Phone className="h-12 w-12 text-white" />
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Incoming {incomingCall.call_type === 'video' ? 'Video' : 'Audio'} Call</h3>
                    <p className="text-lg text-gray-600 mb-6">{incomingCall.from_user_name}</p>
                    <div className="flex items-center justify-center space-x-4">
                      <button
                        onClick={() => {
                          setIncomingCall(null);
                          sendWebSocketMessage({
                            type: 'call_rejected',
                            target_user_id: incomingCall.from_user_id
                          });
                        }}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors flex items-center space-x-2"
                      >
                        <PhoneOff className="h-5 w-5" />
                        <span>Decline</span>
                      </button>
                      <button
                        onClick={() => {
                          // Send accept message - the offer will come via WebSocket
                          sendWebSocketMessage({
                            type: 'call_accepted',
                            target_user_id: incomingCall.from_user_id
                          });
                          // Keep incomingCall state - will be cleared when offer arrives
                          // The offer will be handled in the WebSocket message handler
                        }}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors flex items-center space-x-2"
                      >
                        <Phone className="h-5 w-5" />
                        <span>Accept</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="relative z-10 flex items-center justify-center h-full text-gray-500 p-8">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <MessageCircle className="h-12 w-12 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Welcome to MamaCare Chat</h3>
              <p className="text-sm text-gray-500 mb-6">
                Select a conversation from the sidebar to start chatting, or click "New Chat" to start a new conversation.
              </p>
              {!showNewChat && conversationsData && conversationsData.conversations.length === 0 && (
                <button
                  onClick={() => setShowNewChat(true)}
                  className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
                >
                  Start New Chat
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
