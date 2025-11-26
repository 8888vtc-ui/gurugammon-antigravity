import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../api/client';

export type SocketMessage = {
  type: string;
  payload: any;
  timestamp?: string;
  senderId?: string | null;
};

export const useGameSocket = (
  gameId: string | number | null,
  onEvent: (message: SocketMessage) => void
) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!gameId) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('No auth token found, skipping WebSocket connection');
      return;
    }

    const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
    const wsHost = API_BASE_URL.replace(/^https?:\/\//, '');
    const url = `${wsProtocol}://${wsHost}/ws/game?gameId=${gameId}`;

    // Pass token in a single subprotocol so the backend can read `Bearer <token>` from sec-websocket-protocol
    const ws = new WebSocket(url, [`Bearer ${token}`]);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as SocketMessage;
        onEventRef.current(message);
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason);
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error', error);
    };

    socketRef.current = ws;

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [gameId]); // Re-connect only if gameId changes

  return { isConnected };
};
