// WebSocket Server for Real-Time Multiplayer Backgammon
const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
const { BackgammonGame } = require('./backgammon-engine');
const { logger } = require('./utils/logger');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// WebSocket server instance
let wss = null;

// Connection storage
const activeConnections = new Map(); // connectionId -> { ws, userId, gameId, lastPing }
const gameRooms = new Map(); // gameId -> Set of connectionIds
const waitingPlayers = new Map(); // userId -> { connectionId, preferences }

// Heartbeat interval
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 60000; // 1 minute

class WebSocketServer {
  constructor(server) {
    this.server = server;
    this.init();
    this.startHeartbeat();
  }

  init() {
    // Create WebSocket server
    wss = new WebSocket.Server({
      server: this.server,
      perMessageDeflate: false,
      maxPayload: 1024 * 1024, // 1MB max message size
    });

    wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    wss.on('error', (error) => {
      logger.error('WebSocket Server Error:', error);
    });

    logger.info('🕸️  WebSocket Server initialized');
  }

  async handleConnection(ws, req) {
    try {
      // Extract token from query parameters or headers
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token') || req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        ws.close(4001, 'Authentication required');
        return;
      }

      // Verify user authentication
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        ws.close(4002, 'Invalid authentication');
        return;
      }

      // Generate unique connection ID
      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store connection
      activeConnections.set(connectionId, {
        ws,
        userId: user.id,
        gameId: null,
        lastPing: Date.now(),
        connectedAt: Date.now(),
        username: user.user_metadata?.name || user.email
      });

      // Save to database
      await this.saveConnection(connectionId, user.id);

      logger.info(`🔗 WebSocket connection established: ${connectionId} for user ${user.id}`);

      // Set up event handlers
      ws.on('message', (data) => this.handleMessage(connectionId, data));
      ws.on('close', () => this.handleDisconnection(connectionId));
      ws.on('error', (error) => this.handleError(connectionId, error));
      ws.on('pong', () => this.handlePong(connectionId));

      // Send welcome message
      this.sendToConnection(connectionId, {
        type: 'CONNECTED',
        payload: {
          connectionId,
          userId: user.id,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      logger.error('WebSocket connection error:', error);
      ws.close(4000, 'Internal server error');
    }
  }

  async handleMessage(connectionId, data) {
    try {
      const message = JSON.parse(data.toString());
      const connection = activeConnections.get(connectionId);

      if (!connection) return;

      logger.info(`📨 WebSocket message from ${connectionId}: ${message.type}`);

      switch (message.type) {
        case 'PING':
          this.sendToConnection(connectionId, { type: 'PONG', timestamp: Date.now() });
          break;

        case 'JOIN_GAME':
          await this.handleJoinGame(connectionId, message.payload);
          break;

        case 'LEAVE_GAME':
          await this.handleLeaveGame(connectionId);
          break;

        case 'MAKE_MOVE':
          await this.handleMakeMove(connectionId, message.payload);
          break;

        case 'ROLL_DICE':
          await this.handleRollDice(connectionId);
          break;

        case 'DOUBLE_CUBE':
          await this.handleDoubleCube(connectionId, message.payload);
          break;

        case 'RESPOND_DOUBLE':
          await this.handleRespondDouble(connectionId, message.payload);
          break;

        case 'SEND_MESSAGE':
          await this.handleSendMessage(connectionId, message.payload);
          break;

        case 'FIND_OPPONENT':
          await this.handleFindOpponent(connectionId, message.payload);
          break;

        case 'CANCEL_SEARCH':
          await this.handleCancelSearch(connectionId);
          break;

        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }

    } catch (error) {
      logger.error('WebSocket message handling error:', error);
      this.sendToConnection(connectionId, {
        type: 'ERROR',
        payload: { message: 'Invalid message format' }
      });
    }
  }

  async handleJoinGame(connectionId, payload) {
    const { gameId } = payload;
    const connection = activeConnections.get(connectionId);

    if (!connection || !gameId) return;

    try {
      // Verify game exists and user has access
      const { data: game, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error || !game) {
        this.sendToConnection(connectionId, {
          type: 'ERROR',
          payload: { message: 'Game not found' }
        });
        return;
      }

      // Check if user is a player in this game
      if (game.white_player_id !== connection.userId && game.black_player_id !== connection.userId) {
        this.sendToConnection(connectionId, {
          type: 'ERROR',
          payload: { message: 'Not authorized for this game' }
        });
        return;
      }

      // Leave current game if any
      if (connection.gameId) {
        await this.handleLeaveGame(connectionId);
      }

      // Join new game room
      if (!gameRooms.has(gameId)) {
        gameRooms.set(gameId, new Set());
      }
      gameRooms.get(gameId).add(connectionId);

      // Update connection
      connection.gameId = gameId;
      activeConnections.set(connectionId, connection);

      // Update database
      await supabase
        .from('websocket_connections')
        .update({ game_id: gameId, last_ping: new Date() })
        .eq('connection_id', connectionId);

      // Send game state to player
      const gameState = this.getGameState(gameId);
      this.sendToConnection(connectionId, {
        type: 'GAME_JOINED',
        payload: { game: gameState }
      });

      // Notify other players in the game
      this.broadcastToGame(gameId, {
        type: 'PLAYER_JOINED',
        payload: {
          playerId: connection.userId,
          username: connection.username
        }
      }, connectionId); // Exclude sender

      logger.info(`🎮 Player ${connection.userId} joined game ${gameId}`);

    } catch (error) {
      logger.error('Join game error:', error);
      this.sendToConnection(connectionId, {
        type: 'ERROR',
        payload: { message: 'Failed to join game' }
      });
    }
  }

  async handleLeaveGame(connectionId) {
    const connection = activeConnections.get(connectionId);
    if (!connection || !connection.gameId) return;

    const gameId = connection.gameId;

    // Remove from game room
    if (gameRooms.has(gameId)) {
      gameRooms.get(gameId).delete(connectionId);
      if (gameRooms.get(gameId).size === 0) {
        gameRooms.delete(gameId);
      }
    }

    // Update connection
    connection.gameId = null;
    activeConnections.set(connectionId, connection);

    // Update database
    await supabase
      .from('websocket_connections')
      .update({ game_id: null, last_ping: new Date() })
      .eq('connection_id', connectionId);

    // Notify other players
    this.broadcastToGame(gameId, {
      type: 'PLAYER_LEFT',
      payload: {
        playerId: connection.userId,
        username: connection.username
      }
    });

    logger.info(`👋 Player ${connection.userId} left game ${gameId}`);
  }

  async handleMakeMove(connectionId, payload) {
    const { from, to, gnubgNotation } = payload;
    const connection = activeConnections.get(connectionId);

    if (!connection || !connection.gameId) return;

    try {
      const gameId = connection.gameId;

      // Get game data
      const { data: gameData, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error || !gameData) {
        this.sendToConnection(connectionId, {
          type: 'ERROR',
          payload: { message: 'Game not found' }
        });
        return;
      }

      // Verify it's player's turn
      const isWhitePlayer = gameData.white_player_id === connection.userId;
      const isBlackPlayer = gameData.black_player_id === connection.userId;
      const currentPlayer = gameData.current_player.toLowerCase();

      if ((currentPlayer === 'white' && !isWhitePlayer) || (currentPlayer === 'black' && !isBlackPlayer)) {
        this.sendToConnection(connectionId, {
          type: 'ERROR',
          payload: { message: 'Not your turn' }
        });
        return;
      }

      // Create game instance and validate move
      const game = new BackgammonGame(gameId);
      game.loadFromDatabase(gameData);

      let move;
      if (gnubgNotation) {
        move = game.parseGNUBGNotation(gnubgNotation, game.currentPlayer);
      } else {
        move = { from, to, player: game.currentPlayer };
      }

      // Validate and make move
      const availableMoves = game.getAvailableMoves();
      const validMove = availableMoves.find(m =>
        m.from === move.from && m.to === move.to
      );

      if (!validMove) {
        this.sendToConnection(connectionId, {
          type: 'ERROR',
          payload: { message: 'Invalid move', availableMoves }
        });
        return;
      }

      const result = game.makeMove(validMove);

      // Save updated game state
      await this.saveGameState(gameId, game);

      // Broadcast move to all players in game
      this.broadcastToGame(gameId, {
        type: 'MOVE_MADE',
        payload: {
          move: {
            ...result,
            gnubgNotation: game.moveToGNUBGNotation(result)
          },
          gameState: game.getGameState(),
          player: connection.username
        }
      });

      // Check for game end
      if (game.status === 'FINISHED') {
        this.broadcastToGame(gameId, {
          type: 'GAME_ENDED',
          payload: {
            winner: game.winner,
            finalScore: game.score
          }
        });
      }

    } catch (error) {
      logger.error('Make move error:', error);
      this.sendToConnection(connectionId, {
        type: 'ERROR',
        payload: { message: 'Failed to make move' }
      });
    }
  }

  async handleRollDice(connectionId) {
    const connection = activeConnections.get(connectionId);
    if (!connection || !connection.gameId) return;

    try {
      const gameId = connection.gameId;

      // Get and update game
      const { data: gameData } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      const game = new BackgammonGame(gameId);
      game.loadFromDatabase(gameData);

      // Verify it's player's turn to roll
      const isWhitePlayer = gameData.white_player_id === connection.userId;
      const isBlackPlayer = gameData.black_player_id === connection.userId;
      const currentPlayer = gameData.current_player.toLowerCase();

      if ((currentPlayer === 'white' && !isWhitePlayer) || (currentPlayer === 'black' && !isBlackPlayer)) {
        this.sendToConnection(connectionId, {
          type: 'ERROR',
          payload: { message: 'Not your turn to roll' }
        });
        return;
      }

      const dice = game.rollDice();
      await this.saveGameState(gameId, game);

      // Broadcast dice roll
      this.broadcastToGame(gameId, {
        type: 'DICE_ROLLED',
        payload: {
          dice,
          player: connection.username,
          gameState: game.getGameState()
        }
      });

    } catch (error) {
      logger.error('Roll dice error:', error);
      this.sendToConnection(connectionId, {
        type: 'ERROR',
        payload: { message: 'Failed to roll dice' }
      });
    }
  }

  async handleDoubleCube(connectionId, payload) {
    const { offer } = payload;
    const connection = activeConnections.get(connectionId);
    if (!connection || !connection.gameId) return;

    try {
      const gameId = connection.gameId;

      const { data: gameData } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      const game = new BackgammonGame(gameId);
      game.loadFromDatabase(gameData);

      game.doubleCube();
      await this.saveGameState(gameId, game);

      this.broadcastToGame(gameId, {
        type: 'DOUBLE_OFFERED',
        payload: {
          doublingCube: game.doublingCube,
          player: connection.username
        }
      });

    } catch (error) {
      logger.error('Double cube error:', error);
      this.sendToConnection(connectionId, {
        type: 'ERROR',
        payload: { message: 'Failed to double' }
      });
    }
  }

  async handleRespondDouble(connectionId, payload) {
    const { accept } = payload;
    const connection = activeConnections.get(connectionId);
    if (!connection || !connection.gameId) return;

    try {
      const gameId = connection.gameId;

      const { data: gameData } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      const game = new BackgammonGame(gameId);
      game.loadFromDatabase(gameData);

      game.respondToDouble(accept);
      await this.saveGameState(gameId, game);

      this.broadcastToGame(gameId, {
        type: 'DOUBLE_RESPONDED',
        payload: {
          accepted: accept,
          doublingCube: game.doublingCube,
          player: connection.username
        }
      });

    } catch (error) {
      logger.error('Respond double error:', error);
      this.sendToConnection(connectionId, {
        type: 'ERROR',
        payload: { message: 'Failed to respond to double' }
      });
    }
  }

  async handleSendMessage(connectionId, payload) {
    const { message, messageType = 'TEXT' } = payload;
    const connection = activeConnections.get(connectionId);
    if (!connection || !connection.gameId) return;

    try {
      // Save message to database
      await supabase
        .from('chat_messages')
        .insert({
          game_id: connection.gameId,
          user_id: connection.userId,
          message,
          message_type: messageType
        });

      // Broadcast message to game room
      this.broadcastToGame(connection.gameId, {
        type: 'CHAT_MESSAGE',
        payload: {
          message,
          messageType,
          player: connection.username,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      logger.error('Send message error:', error);
    }
  }

  async handleFindOpponent(connectionId, payload) {
    const { preferences = {} } = payload;
    const connection = activeConnections.get(connectionId);

    if (!connection) return;

    // Add to waiting list
    waitingPlayers.set(connection.userId, {
      connectionId,
      preferences,
      joinedAt: Date.now()
    });

    this.sendToConnection(connectionId, {
      type: 'SEARCHING_OPPONENT',
      payload: { status: 'searching' }
    });

    // Try to match with another waiting player
    await this.attemptMatchmaking(connection.userId);

    logger.info(`🔍 Player ${connection.userId} started searching for opponent`);
  }

  async handleCancelSearch(connectionId) {
    const connection = activeConnections.get(connectionId);
    if (!connection) return;

    waitingPlayers.delete(connection.userId);

    this.sendToConnection(connectionId, {
      type: 'SEARCH_CANCELLED',
      payload: { status: 'cancelled' }
    });

    logger.info(`❌ Player ${connection.userId} cancelled opponent search`);
  }

  async attemptMatchmaking(userId) {
    const player1 = waitingPlayers.get(userId);
    if (!player1) return;

    // Find another waiting player
    for (const [otherUserId, player2] of waitingPlayers) {
      if (otherUserId !== userId) {
        // Create new game
        const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
          // Create game in database
          const { data: game, error } = await supabase
            .from('games')
            .insert({
              id: gameId,
              white_player_id: userId,
              black_player_id: otherUserId,
              game_mode: 'PLAYER_VS_PLAYER',
              status: 'PLAYING',
              board_state: JSON.stringify(new BackgammonGame().board),
              current_player: 'WHITE'
            })
            .select()
            .single();

          if (error) throw error;

          // Remove both players from waiting list
          waitingPlayers.delete(userId);
          waitingPlayers.delete(otherUserId);

          // Notify both players
          this.sendToConnection(player1.connectionId, {
            type: 'GAME_FOUND',
            payload: { gameId, opponent: otherUserId }
          });

          this.sendToConnection(player2.connectionId, {
            type: 'GAME_FOUND',
            payload: { gameId, opponent: userId }
          });

          logger.info(`🎯 Matched players ${userId} vs ${otherUserId} in game ${gameId}`);
          return;

        } catch (error) {
          logger.error('Matchmaking error:', error);
        }
      }
    }
  }

  handleDisconnection(connectionId) {
    const connection = activeConnections.get(connectionId);
    if (!connection) return;

    logger.info(`🔌 WebSocket disconnection: ${connectionId}`);

    // Leave game if in one
    if (connection.gameId) {
      this.handleLeaveGame(connectionId);
    }

    // Remove from waiting list
    waitingPlayers.delete(connection.userId);

    // Remove connection
    activeConnections.delete(connectionId);

    // Mark as inactive in database
    supabase
      .from('websocket_connections')
      .update({ is_active: false })
      .eq('connection_id', connectionId)
      .catch(error => logger.error('Database update error:', error));
  }

  handleError(connectionId, error) {
    logger.error(`WebSocket error for ${connectionId}:`, error);
    this.handleDisconnection(connectionId);
  }

  handlePong(connectionId) {
    const connection = activeConnections.get(connectionId);
    if (connection) {
      connection.lastPing = Date.now();
      activeConnections.set(connectionId, connection);
    }
  }

  // Utility methods
  sendToConnection(connectionId, message) {
    const connection = activeConnections.get(connectionId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  broadcastToGame(gameId, message, excludeConnectionId = null) {
    const room = gameRooms.get(gameId);
    if (!room) return;

    room.forEach(connId => {
      if (connId !== excludeConnectionId) {
        this.sendToConnection(connId, message);
      }
    });
  }

  getGameState(gameId) {
    // This would load full game state from database/cache
    // For now, return basic info
    return {
      id: gameId,
      status: 'PLAYING',
      currentPlayer: 'WHITE'
    };
  }

  async saveConnection(connectionId, userId) {
    try {
      await supabase
        .from('websocket_connections')
        .insert({
          id: connectionId,
          connection_id: connectionId,
          user_id: userId,
          is_active: true
        });
    } catch (error) {
      logger.error('Save connection error:', error);
    }
  }

  async saveGameState(gameId, game) {
    try {
      await supabase
        .from('games')
        .update({
          board_state: JSON.stringify(game.board),
          current_player: game.currentPlayer,
          dice: game.dice,
          status: game.status,
          winner: game.winner,
          score_white: game.score.white,
          score_black: game.score.black,
          doubling_cube: JSON.stringify(game.doublingCube),
          updated_at: new Date()
        })
        .eq('id', gameId);
    } catch (error) {
      logger.error('Save game state error:', error);
    }
  }

  startHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      activeConnections.forEach((connection, connectionId) => {
        // Check for timed out connections
        if (now - connection.lastPing > CONNECTION_TIMEOUT) {
          logger.warn(`⏰ Connection ${connectionId} timed out`);
          connection.ws.close(4000, 'Connection timeout');
          return;
        }

        // Send ping
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.ping();
        }
      });
    }, HEARTBEAT_INTERVAL);
  }

  // Get server stats
  getStats() {
    return {
      activeConnections: activeConnections.size,
      activeGames: gameRooms.size,
      waitingPlayers: waitingPlayers.size,
      uptime: Math.round(process.uptime())
    };
  }
}

// Export singleton
let websocketServer = null;

const initWebSocketServer = (server) => {
  if (!websocketServer) {
    websocketServer = new WebSocketServer(server);
  }
  return websocketServer;
};

module.exports = {
  initWebSocketServer,
  WebSocketServer,
  getWebSocketStats: () => websocketServer ? websocketServer.getStats() : null
};
