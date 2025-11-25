import { type FC, useState, useMemo } from 'react';
import './GameChat.css';
import { useGameChat } from '../../hooks/useGameChat';

export interface GameChatProps {
  roomId: string | number | null;
  userId?: string | null;
}

export const GameChat: FC<GameChatProps> = ({ roomId, userId }) => {
  const [input, setInput] = useState('');

  const effectiveUserId = useMemo(() => {
    if (userId && userId.trim().length > 0) return userId.trim();
    return 'Vous';
  }, [userId]);

  const { messages, isConnected, isConnecting, error, sendMessage } = useGameChat({ roomId, userId });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div className="game-chat">
      <div className="game-chat-header">
        <div className="game-chat-title">Chat de partie</div>
        <div className={`game-chat-status ${isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected'}`}>
          {isConnected ? 'Connecté' : isConnecting ? 'Connexion…' : 'Hors ligne'}
        </div>
      </div>

      <div className="game-chat-messages">
        {messages.length === 0 && (
          <div className="game-chat-empty">Aucun message pour le moment. Dites bonjour à votre adversaire !</div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`game-chat-message ${msg.isOwn ? 'own' : 'other'}`}
          >
            <div className="game-chat-message-meta">
              <span className="author">{msg.isOwn ? effectiveUserId : msg.userId || 'Adversaire'}</span>
              <span className="time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="game-chat-message-body">{msg.message}</div>
          </div>
        ))}
      </div>

      <form className="game-chat-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          className="game-chat-input"
          placeholder={isConnected ? 'Écrire un message…' : 'Chat indisponible'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!isConnected}
        />
        <button
          type="submit"
          className="btn btn-secondary game-chat-send"
          disabled={!isConnected || !input.trim()}
        >
          Envoyer
        </button>
      </form>

      {error && <div className="game-chat-error">{error}</div>}
    </div>
  );
};
