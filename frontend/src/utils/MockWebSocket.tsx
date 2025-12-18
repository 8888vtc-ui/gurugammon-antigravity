import { useEffect, useState } from 'react';

// Global controller for Playwright to interact with
if (typeof window !== 'undefined') {
    (window as any).__MOCK_WS__ = {
        listeners: new Set(),
        emit: (data: any) => {
            console.log("Mock WS emitting:", data);
            (window as any).__MOCK_WS__.listeners.forEach((l: any) => l(data));
        }
    };
}

export const useWebSocket = (url: string) => {
    const [isConnected, _setIsConnected] = useState(true);
    const [lastMessage, setLastMessage] = useState<any>(null);

    useEffect(() => {
        console.log("Mock WebSocket initialized for", url);
        const listener = (data: any) => {
            setLastMessage(data);
        };

        if ((window as any).__MOCK_WS__) {
            (window as any).__MOCK_WS__.listeners.add(listener);
        }

        return () => {
            if ((window as any).__MOCK_WS__) {
                (window as any).__MOCK_WS__.listeners.delete(listener);
            }
        };
    }, [url]);

    const sendMessage = (msg: any) => {
        console.log("Mock WS sending:", msg);
        // We could verify outgoing messages here if needed
    };

    return { isConnected, lastMessage, sendMessage };
};
