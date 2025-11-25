import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameState } from '../types';

export type GameSocketMessage =
  | { type: 'GAME_UPDATE'; payload: GameState }
  | { type: 'GAME_MOVE'; payload: GameState }
  | { type: string; payload?: unknown };

export type UseGameSocketOptions = {
  gameId: string | number | null;
  /** Optionnel : URL de base du backend pour le WebSocket (par défaut dérivée de window.location) */
  baseWsUrl?: string;
};

export type UseGameSocketResult = {
  gameState: GameState | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMove: (move: unknown) => void;
};

function buildWebSocketUrl(path: string, baseOverride?: string): string {
  if (baseOverride) {
    return `${baseOverride.replace(/\/$/, '')}${path}`;
  }

  if (typeof window === 'undefined') {
    return `ws://localhost:3000${path}`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}${path}`;
}

export function useGameSocket(options: UseGameSocketOptions): UseGameSocketResult {
  const { gameId, baseWsUrl } = options;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  const sendMove = useCallback((move: unknown) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'GAME_MOVE',
      payload: move,
    };

    try {
      socket.send(JSON.stringify(message));
    } catch (err) {
      console.error('Failed to send move over WebSocket', err);
    }
  }, []);

  useEffect(() => {
    if (!gameId) {
      return;
    }

    const path = `/ws/game?gameId=${encodeURIComponent(String(gameId))}`;
    const url = buildWebSocketUrl(path, baseWsUrl);

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    socket.onclose = () => {
      setIsConnected(false);
    };

    socket.onerror = (event) => {
      console.error('Game WebSocket error', event);
      setError('Erreur de connexion WebSocket.');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as GameSocketMessage;

        if (data.type === 'GAME_UPDATE' || data.type === 'GAME_MOVE') {
          if (data.payload) {
            setGameState(data.payload as GameState);
          }
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    };

    return () => {
      socketRef.current = null;
      try {
        socket.close();
      } catch {
        // ignore
      }
    };
  }, [gameId, baseWsUrl]);

  const isConnecting = !isConnected && !error;

  return {
    gameState,
    isConnected,
    isConnecting,
    error,
    sendMove,
  };
}
