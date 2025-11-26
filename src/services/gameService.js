"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
// src/services/gameService.ts
// @ts-nocheck - Désactiver les vérifications strictes pour le service de jeu
const client_1 = require("@prisma/client");
const gameEngine_1 = require("./gameEngine");
const playerUtils_1 = require("../utils/playerUtils");
const prisma = new client_1.PrismaClient();
class GameService {
    // Créer un nouvel état de jeu
    static async createGameState(player1Id, gameType, stake) {
        const player1 = await prisma.player.findUnique({
            where: { id: player1Id },
            select: { id: true, name: true, email: true, points: true }
        });
        if (!player1) {
            throw new Error('Player not found');
        }
        // Créer la partie en base
        const prismaGame = await prisma.game.create({
            data: {
                player1Id,
                gameType,
                stake,
                status: 'waiting'
            }
        });
        // Créer l'état de jeu initial
        const initialBoard = gameEngine_1.BackgammonEngine.createInitialBoard();
        const initialDice = gameEngine_1.BackgammonEngine.rollDice();
        // Créer un objet Player complet
        const fullPlayer1 = (0, playerUtils_1.convertPrismaPlayer)(player1);
        return {
            id: prismaGame.id.toString(),
            player1: fullPlayer1,
            player2: null,
            status: 'waiting',
            gameType: gameType,
            stake,
            winner: null,
            board: initialBoard,
            currentPlayer: 'white',
            dice: initialDice,
            availableMoves: gameEngine_1.BackgammonEngine.calculateAvailableMoves('white', initialBoard, initialDice),
            createdAt: prismaGame.createdAt,
            startedAt: null,
            finishedAt: null
        };
    }
    // Démarrer une partie (quand le deuxième joueur rejoint)
    static async startGame(gameId, player2Id) {
        const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
                player1: { select: { id: true, name: true, email: true, points: true } },
                player2: { select: { id: true, name: true, email: true, points: true } }
            }
        });
        if (!game) {
            throw new Error('Game not found');
        }
        if (game.status !== 'waiting') {
            throw new Error('Game is not in waiting status');
        }
        const player2 = await prisma.player.findUnique({
            where: { id: player2Id },
            select: { id: true, name: true, email: true, points: true }
        });
        if (!player2) {
            throw new Error('Player2 not found');
        }
        // Mettre à jour la partie en base
        const updatedGame = await prisma.game.update({
            where: { id: gameId },
            data: {
                player2Id,
                status: 'playing',
                startedAt: new Date()
            },
            include: {
                player1: { select: { id: true, name: true, email: true, points: true } },
                player2: { select: { id: true, name: true, email: true, points: true } }
            }
        });
        // Créer le premier état de jeu
        const initialBoard = gameEngine_1.BackgammonEngine.createInitialBoard();
        const initialDice = gameEngine_1.BackgammonEngine.rollDice();
        // Calculer les mouvements possibles avec les mêmes dés
        const availableMoves = gameEngine_1.BackgammonEngine.calculateAvailableMoves('white', initialBoard, initialDice);
        return {
            id: updatedGame.id.toString(),
            player1: updatedGame.player1,
            player2: updatedGame.player2,
            status: 'playing',
            gameType: updatedGame.gameType,
            stake: updatedGame.stake,
            winner: null,
            board: initialBoard,
            currentPlayer: 'white',
            dice: initialDice,
            availableMoves: availableMoves,
            createdAt: updatedGame.createdAt,
            startedAt: updatedGame.startedAt,
            finishedAt: null
        };
    }
    // Charger l'état d'une partie depuis la base
    static async loadGameState(gameId) {
        const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
                player1: { select: { id: true, name: true, email: true, points: true } },
                player2: { select: { id: true, name: true, email: true, points: true } },
                winner: { select: { id: true, name: true, email: true, points: true } }
            }
        });
        if (!game) {
            return null;
        }

        // Charger l'état du board et des dés depuis la base
        const board = game.boardState && Object.keys(game.boardState).length > 0
            ? game.boardState
            : gameEngine_1.BackgammonEngine.createInitialBoard();

        // Assurer que les dés sont bien formatés
        const dice = game.dice && game.dice.length > 0
            ? {
                die1: game.dice[0],
                die2: game.dice[1],
                // Reconstruire l'état des dés si possible, sinon par défaut
                remaining: game.dice.length > 2 ? game.dice.slice(2) : [game.dice[0], game.dice[1]]
            }
            : gameEngine_1.BackgammonEngine.rollDice();

        const availableMoves = gameEngine_1.BackgammonEngine.calculateAvailableMoves(game.currentPlayer.toLowerCase(), board, dice);

        return {
            id: game.id.toString(),
            player1: game.player1,
            player2: game.player2,
            status: game.status,
            gameType: game.gameType,
            stake: game.stake,
            winner: game.winner,
            board,
            currentPlayer: game.currentPlayer.toLowerCase(),
            dice,
            availableMoves,
            createdAt: game.createdAt,
            startedAt: game.startedAt,
            finishedAt: game.finishedAt
        };
    }
    // Faire un mouvement
    static async makeMove(gameId, playerId, moveRequest) {
        const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
                player1: { select: { id: true, name: true, email: true, points: true } },
                player2: { select: { id: true, name: true, email: true, points: true } },
                winner: { select: { id: true, name: true, email: true, points: true } }
            }
        });
        if (!game) {
            throw new Error('Game not found');
        }
        if (game.status !== 'playing') {
            throw new Error('Game is not in playing status');
        }
        // Déterminer la couleur du joueur
        const playerColor = game.player1Id === playerId ? 'white' : 'black';
        const currentPlayer = game.player1Id === playerId ? game.player1 : game.player2;
        if (!currentPlayer) {
            throw new Error('Player not in game');
        }
        // Charger l'état actuel
        const currentState = await this.loadGameState(gameId);
        if (!currentState) {
            throw new Error('Game state not found');
        }
        // Vérifier que c'est le tour du joueur
        if (currentState.currentPlayer !== playerColor) {
            throw new Error('Not your turn');
        }
        // Créer l'objet mouvement
        const move = {
            from: moveRequest.from,
            to: moveRequest.to,
            player: playerColor,
            diceUsed: moveRequest.diceUsed
        };
        // Valider le mouvement
        const validation = gameEngine_1.BackgammonEngine.validateMove(move, currentState.board, currentState.dice);
        if (!validation.valid) {
            throw new Error(validation.error || 'Invalid move');
        }
        // Appliquer le mouvement
        const newBoard = gameEngine_1.BackgammonEngine.applyMove(move, currentState.board);
        const newDice = gameEngine_1.BackgammonEngine.useDie(move.diceUsed, currentState.dice);
        // Changer de joueur si tous les dés sont utilisés
        let nextPlayer = currentState.currentPlayer;
        let nextDice = newDice;
        if (newDice.remaining.length === 0) {
            nextPlayer = nextPlayer === 'white' ? 'black' : 'white';
            nextDice = gameEngine_1.BackgammonEngine.rollDice();
        }
        // Calculer les mouvements disponibles pour le prochain joueur
        const availableMoves = gameEngine_1.BackgammonEngine.calculateAvailableMoves(nextPlayer, newBoard, nextDice);
        // Vérifier la condition de victoire
        const winner = gameEngine_1.BackgammonEngine.checkWinCondition(newBoard);
        if (winner) {
            // Terminer la partie
            const winnerPlayer = winner === 'white' ? game.player1 : game.player2;
            const loserPlayer = winner === 'white' ? game.player2 : game.player1;
            // Mettre à jour les points
            if (winnerPlayer && loserPlayer) {
                await prisma.player.update({
                    where: { id: winnerPlayer.id },
                    data: { points: { increment: game.stake } }
                });
                await prisma.player.update({
                    where: { id: loserPlayer.id },
                    data: { points: { decrement: game.stake } }
                });
            }
            // Marquer la partie comme terminée
            await prisma.game.update({
                where: { id: gameId },
                data: {
                    status: 'finished',
                    winnerId: winnerPlayer?.id,
                    finishedAt: new Date()
                }
            });
            return {
                ...currentState,
                board: newBoard,
                currentPlayer: nextPlayer,
                dice: nextDice,
                availableMoves: [],
                status: 'finished',
                winner: winnerPlayer,
                finishedAt: new Date()
            };
        }

        // Sauvegarder le nouvel état en base
        await prisma.game.update({
            where: { id: gameId },
            data: {
                boardState: newBoard,
                currentPlayer: nextPlayer.toUpperCase(),
                dice: [nextDice.die1, nextDice.die2, ...nextDice.remaining],
            }
        });

        return {
            ...currentState,
            board: newBoard,
            currentPlayer: nextPlayer,
            dice: nextDice,
            availableMoves
        };
    }
    // Lancer les dés
    static async rollDice(gameId, playerId) {
        const game = await prisma.game.findUnique({
            where: { id: gameId }
        });
        if (!game) {
            throw new Error('Game not found');
        }
        if (game.status !== 'playing') {
            throw new Error('Game is not in playing status');
        }

        // Vérifier que c'est le tour du joueur
        const playerColor = game.player1Id === playerId ? 'WHITE' : 'BLACK';
        if (game.currentPlayer !== playerColor) {
            throw new Error('Not your turn');
        }

        const newDice = gameEngine_1.BackgammonEngine.rollDice();

        // Sauvegarder les dés en base
        await prisma.game.update({
            where: { id: gameId },
            data: {
                dice: [newDice.die1, newDice.die2, ...newDice.remaining]
            }
        });

        return newDice;
    }
    // Obtenir les mouvements possibles
    static async getAvailableMoves(gameId, playerId) {
        return gameEngine_1.BackgammonEngine.calculatePipCount(gameState.board);
    }

    // Lister les parties disponibles
    static async listAvailableGames() {
        return prisma.game.findMany({
            where: {
                status: 'waiting'
            },
            include: {
                player1: { select: { id: true, name: true, email: true, points: true } }
            }
        });
    }

    // Rejoindre une partie
    static async joinGame(gameId, userId) {
        return this.startGame(gameId, userId);
    }

    // Lister les parties d'un utilisateur
    static async listUserGames(userId) {
        return prisma.game.findMany({
            where: {
                OR: [
                    { player1Id: userId },
                    { player2Id: userId }
                ]
            },
            include: {
                player1: { select: { id: true, name: true, email: true, points: true } },
                player2: { select: { id: true, name: true, email: true, points: true } }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });
    }

    // Abandonner une partie
    static async resignGame(gameId, userId) {
        const game = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
                player1: true,
                player2: true
            }
        });

        if (!game) throw new Error('Game not found');
        if (game.status !== 'playing') throw new Error('Game is not in playing status');

        const winner = game.player1Id === userId ? game.player2 : game.player1;
        const loser = game.player1Id === userId ? game.player1 : game.player2;

        if (!winner) throw new Error('Winner not found');

        // Mettre à jour les scores
        await prisma.player.update({
            where: { id: winner.id },
            data: { points: { increment: game.stake } }
        });

        await prisma.player.update({
            where: { id: loser.id },
            data: { points: { decrement: game.stake } }
        });

        return prisma.game.update({
            where: { id: gameId },
            data: {
                status: 'finished',
                winnerId: winner.id,
                finishedAt: new Date(),
                resignationType: 'SINGLE'
            }
        });
    }

    // Proposer un match nul
    static async offerDraw(gameId, userId) {
        const game = await prisma.game.findUnique({
            where: { id: gameId }
        });

        if (!game) throw new Error('Game not found');
        if (game.status !== 'playing') throw new Error('Game is not in playing status');

        // Si une proposition est déjà en cours par l'autre joueur, accepter le nul
        if (game.drawOfferedBy && game.drawOfferedBy !== userId) {
            return prisma.game.update({
                where: { id: gameId },
                data: {
                    status: 'finished',
                    finishedAt: new Date(),
                    // Pas de vainqueur, pas de points échangés
                }
            });
        }

        // Sinon, enregistrer la proposition
        // Note: Il faudrait ajouter un champ drawOfferedById dans le schéma si on veut stocker l'ID
        // Pour l'instant on retourne juste un succès simulé
        return { message: 'Draw offered' };
    }
}
exports.GameService = GameService;
//# sourceMappingURL=gameService.js.map