import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
    type: string;
    gameId?: string;
    payload?: unknown;
    [key: string]: unknown;
}

interface UseWebSocketOptions {
    maxReconnectAttempts?: number;
    initialReconnectDelay?: number;
    maxReconnectDelay?: number;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Event) => void;
}

export const useWebSocket = (url: string, options: UseWebSocketOptions = {}) => {
    const {
        maxReconnectAttempts = 10,
        initialReconnectDelay = 1000,
        maxReconnectDelay = 30000,
        onConnect,
        onDisconnect,
        onError
    } = options;

    const ws = useRef<WebSocket | null>(null);
    const reconnectAttempts = useRef(0);
    const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isUnmounting = useRef(false);

    const [isConnected, setIsConnected] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const connect = useCallback(() => {
        if (isUnmounting.current) return;

        const token = localStorage.getItem('token');
        const wsUrl = token ? `${url}?token=${token}` : url;

        try {
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log('🔌 WebSocket Connected');
                setIsConnected(true);
                setIsReconnecting(false);
                setConnectionError(null);
                reconnectAttempts.current = 0;
                onConnect?.();
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setLastMessage(data);
                } catch (e) {
                    console.error('WebSocket message parse error', e);
                }
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket Error:', error);
                setConnectionError('Connection error');
                onError?.(error);
            };

            ws.current.onclose = (event) => {
                console.log(`🔌 WebSocket Disconnected (code: ${event.code})`);
                setIsConnected(false);
                onDisconnect?.();

                // Don't reconnect if unmounting or if closed cleanly
                if (isUnmounting.current || event.code === 1000) return;

                // Attempt reconnection with exponential backoff
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    setIsReconnecting(true);
                    const delay = Math.min(
                        initialReconnectDelay * Math.pow(2, reconnectAttempts.current),
                        maxReconnectDelay
                    );
                    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

                    reconnectTimeout.current = setTimeout(() => {
                        reconnectAttempts.current++;
                        connect();
                    }, delay);
                } else {
                    console.log('❌ Max reconnection attempts reached');
                    setIsReconnecting(false);
                    setConnectionError('Maximum reconnection attempts reached');
                }
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            setConnectionError('Failed to create connection');
        }
    }, [url, maxReconnectAttempts, initialReconnectDelay, maxReconnectDelay, onConnect, onDisconnect, onError]);

    // Initial connection
    useEffect(() => {
        isUnmounting.current = false;
        connect();

        return () => {
            isUnmounting.current = true;
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
            ws.current?.close(1000, 'Component unmounting');
        };
    }, [connect]);

    // Send message function
    const sendMessage = useCallback((msg: WebSocketMessage | object) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(msg));
            return true;
        }
        console.warn('WebSocket not connected, message not sent');
        return false;
    }, []);

    // Manual reconnect function
    const reconnect = useCallback(() => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
        }
        reconnectAttempts.current = 0;
        ws.current?.close();
        connect();
    }, [connect]);

    // Subscribe to specific game updates
    const subscribeToGame = useCallback((gameId: string) => {
        sendMessage({ type: 'subscribe', gameId });
    }, [sendMessage]);

    // Unsubscribe from game updates
    const unsubscribeFromGame = useCallback((gameId: string) => {
        sendMessage({ type: 'unsubscribe', gameId });
    }, [sendMessage]);

    return {
        isConnected,
        isReconnecting,
        connectionError,
        lastMessage,
        sendMessage,
        reconnect,
        subscribeToGame,
        unsubscribeFromGame
    };
};
