import { useEffect, useRef, useState } from 'react';
import './App.css';
import { GameBoard } from './components/GameBoard/GameBoard';
import { GameChat } from './components/GameChat/GameChat';
import { MoveHistory } from './components/MoveHistory/MoveHistory';
import { useBackgammon } from './hooks/useBackgammon';
import soundService from './services/soundService';
import { apiClient } from './api/client';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';

function App() {
  const [gameId, setGameId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isRollingDice, setIsRollingDice] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showAuthPanel, setShowAuthPanel] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const rollStartRef = useRef<number | null>(null)
  const lastMoveRef = useRef<{ from: number; to: number } | null>(null)
  const lastWinnerRef = useRef<string | null>(null)

  // Initialiser l'état d'authentification à partir du token stocké
  useEffect(() => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
    const token = localStorage.getItem('authToken')
    setIsAuthenticated(!!token)
  }, [])

  const handleAuthenticated = () => {
    setIsAuthenticated(true)
    setShowAuthPanel(false)
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('authToken')
    }
    setIsAuthenticated(false)
  }

  // Initialisation de la partie via API
  const startGame = async (mode: 'AI_VS_PLAYER' | 'PLAYER_VS_PLAYER') => {
    // L'utilisateur a choisi un mode : on quitte l'écran de sélection
    setHasStarted(true)
    setConnectionError(null)
    setIsConnected(false)

    try {
      // Créer une nouvelle partie côté backend (mode en ligne)
      const response = await apiClient.createGame<any>({
        gameType: 'match',
        stake: 100,
        game_mode: mode
      });

      const anyResp = response as any
      const newGameId = anyResp?.data?.id ?? anyResp?.id

      if (newGameId) {
        console.log('Game initialized via API:', newGameId)
        setGameId(String(newGameId))
        setIsConnected(true)
        setConnectionError(null)
      } else {
        // Réponse inattendue : on reste en mode local
        setConnectionError('Online mode unavailable, starting a local game instead.')
      }
    } catch (err) {
      console.error('Failed to initialize game via API, falling back to local mode:', err);
      setIsConnected(false)
      setConnectionError('Online mode unavailable, playing in local mode.')
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

  if (!hasStarted) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="container flex justify-between items-center">
            <h1 className="app-title text-glow-purple">GuruGammon</h1>
            <div className="header-actions">
              <span style={{ color: 'white', marginRight: '0.5rem', fontSize: '0.9rem' }}>
                {isAuthenticated ? 'Logged in' : 'Guest (local only)'}
              </span>
              {isAuthenticated ? (
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      setShowAuthPanel(true)
                      setAuthMode('login')
                    }}
                  >
                    Login
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => {
                      setShowAuthPanel(true)
                      setAuthMode('register')
                    }}
                  >
                    Register
                  </button>
                </>
              )}
            </div>
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
          {showAuthPanel && (
            <div style={{ marginTop: '2rem', display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
              {authMode === 'login' ? (
                <LoginForm onAuthenticated={handleAuthenticated} />
              ) : (
                <RegisterForm onRegistered={handleAuthenticated} />
              )}
            </div>
          )}
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
          {connectionError && (
            <div style={{ marginBottom: '0.75rem', color: '#f97316' }}>
              {connectionError}
            </div>
          )}
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
