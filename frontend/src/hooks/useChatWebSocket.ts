import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useChatWebSocket(token: string | null, onMessage?: (message: WebSocketMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    // Determine WebSocket URL for chat
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const wsUrl = apiBaseUrl.replace(/^https?:\/\//, `${wsProtocol}//`).replace(/\/$/, '') + `/ws/chat/${token}`;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[Chat WebSocket] Connected');
          setIsConnected(true);
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            setLastMessage(message);
            if (onMessage) {
              onMessage(message);
            }
          } catch (error) {
            console.error('[Chat WebSocket] Error parsing message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('[Chat WebSocket] Error:', error);
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log('[Chat WebSocket] Disconnected');
          setIsConnected(false);
          // Attempt to reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        };
      } catch (error) {
        console.error('[Chat WebSocket] Error creating connection:', error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [token, onMessage]);

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[Chat WebSocket] Cannot send message - not connected');
    }
  };

  return { isConnected, lastMessage, sendMessage };
}

