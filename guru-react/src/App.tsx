import { useEffect, useRef, useState } from 'react';
import './App.css';
import { GameBoard } from './components/GameBoard/GameBoard';
import { GameChat } from './components/GameChat/GameChat';
import { MoveHistory } from './components/MoveHistory/MoveHistory';
import { useBackgammon } from './hooks/useBackgammon';
import soundService from './services/soundService';
import { apiClient } from './api/client';

function App() {
  const [gameId, setGameId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isRollingDice, setIsRollingDice] = useState(false)
  const rollStartRef = useRef<number | null>(null)
  const lastMoveRef = useRef<{ from: number; to: number } | null>(null)
  const lastWinnerRef = useRef<string | null>(null)

  // Initialisation de la partie via API
  const startGame = async (mode: 'AI_VS_PLAYER' | 'PLAYER_VS_PLAYER') => {
    try {
      // Créer une nouvelle partie
      const response = await apiClient.createGame<any>({
        gameType: 'match',
        stake: 100,
        game_mode: mode
      });

      const newGameId = response.id || response.data?.id;
      if (newGameId) {
        console.log('Game initialized via API:', newGameId);
        setGameId(newGameId);
        setIsConnected(true);
      }
    } catch (err) {
      console.error('Failed to initialize game via API, falling back to local mode:', err);
      setIsConnected(false);
    }
  };

  // Hook de jeu (API mode si gameId présent, sinon Local)
  const { gameState, rollDice, handlePointClick, requestHint, error } = useBackgammon({ gameId });

  const handleRollClick = async () => {
    if (isRollingDice || gameState.dice.length > 0) return

    setIsRollingDice(true)
    rollStartRef.current = Date.now()

    soundService.playDiceRoll()

    try {
      await rollDice()
    } catch (err) {
      setIsRollingDice(false)
      rollStartRef.current = null
      throw err
    }
  }

  // Arrêter l'animation une fois que les dés ont été mis à jour
  useEffect(() => {
    if (!isRollingDice) return
    if (gameState.dice.length === 0) return

    const startedAt = rollStartRef.current ?? Date.now()
    const elapsed = Date.now() - startedAt
    const remaining = Math.max(0, 1000 - elapsed)

    const timeout = setTimeout(() => {
      setIsRollingDice(false)
      rollStartRef.current = null
    }, remaining)

    return () => clearTimeout(timeout)
  }, [isRollingDice, gameState.dice])

  // Son de placement de pion (nouveau lastMove)
  useEffect(() => {
    const last = gameState.lastMove
    if (!last) return

    const prev = lastMoveRef.current
    if (!prev || prev.from !== last.from || prev.to !== last.to) {
      soundService.playCheckerMove()
      lastMoveRef.current = last
    }
  }, [gameState.lastMove])

  // Son de fin de partie
  useEffect(() => {
    const winner = gameState.winner
    if (!winner) return

    if (lastWinnerRef.current === winner) return

    soundService.playGameWin()
    lastWinnerRef.current = winner
  }, [gameState.winner])

  if (!gameId) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="container flex justify-between items-center">
            <h1 className="app-title text-glow-purple">GuruGammon</h1>
          </div>
        </header>
        <main className="app-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
          <h2 style={{ color: 'white', marginBottom: '2rem', fontSize: '2rem' }}>Choose Game Mode</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn btn-primary" 
              style={{ padding: '1rem 2rem', fontSize: '1.2rem' }}
              onClick={() => startGame('AI_VS_PLAYER')}
            >
              Play vs AI (GNUBG)
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '1rem 2rem', fontSize: '1.2rem' }}
              onClick={() => startGame('PLAYER_VS_PLAYER')}
            >
              Play vs Human (Local/Online)
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="container flex justify-between items-center">
          <div className="flex items-center gap-lg">
            <h1 className="app-title text-glow-purple">GuruGammon</h1>
            <div className={`status-badge ${isConnected ? 'status-connected' : 'status-connecting'}`}>
              <div className="status-dot" />
              <span>{isConnected ? 'Online (API Mode)' : 'Offline Mode (Local Play)'}</span>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-ghost">Settings</button>
            <button
              className="btn btn-primary"
              onClick={handleRollClick}
              disabled={isRollingDice || gameState.dice.length > 0}
            >
              {isRollingDice
                ? 'Rolling...'
                : gameState.dice.length > 0
                  ? `Dice: ${gameState.dice.join('-')}`
                  : 'Roll Dice'}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => requestHint?.()}
            >
              Hint (IA)
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <div className="container">
          <div className="game-info-bar" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', color: 'white' }}>
            <span>Current Turn: <strong>{gameState.currentPlayer.toUpperCase()}</strong></span>
            {gameState.winner && <span style={{ color: '#4ade80' }}>WINNER: {gameState.winner.toUpperCase()}!</span>}
          </div>
          {error && (
            <div style={{ marginBottom: '0.75rem', color: '#f97316' }}>
              {error}
            </div>
          )}
          <div className="game-layout">
            <GameBoard
              board={gameState.board.points}
              whiteBar={gameState.board.whiteBar}
              blackBar={gameState.board.blackBar}
              whiteOff={gameState.board.whiteOff}
              blackOff={gameState.board.blackOff}
              dice={gameState.dice as [number, number]}
              isRollingDice={isRollingDice}
              cubeValue={1}
              cubeOwner={null}
              currentPlayer={gameState.currentPlayer}
              lastMove={gameState.lastMove ?? undefined}
              hintMove={gameState.hintMove ?? undefined}
              selectedPoint={gameState.selectedPoint}
              validMoves={gameState.validMoves}
              onPointClick={handlePointClick}
            />
            <div className="game-side-panel">
              <MoveHistory moves={gameState.moveHistory} />
              <div className="game-chat-wrapper">
                <GameChat roomId={gameId || "local-room"} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
