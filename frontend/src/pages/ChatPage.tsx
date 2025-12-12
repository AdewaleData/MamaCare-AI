import React from 'react';
import Chat from '../components/Chat';

export default function ChatPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">MamaCare Chat</h1>
        <p className="text-gray-600 mt-2">Chat with your healthcare provider</p>
      </div>
      <div className="h-[calc(100vh-200px)]">
        <Chat showConversationList={true} />
      </div>
    </div>
  );
}

