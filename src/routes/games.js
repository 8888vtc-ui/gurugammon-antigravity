"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/games.ts
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const gameController_1 = require("../controllers/gameController");
const router = express_1.default.Router();
// Toutes les routes de jeu nécessitent une authentification
router.use(authMiddleware_1.authMiddleware);
// POST /api/games - Créer une nouvelle partie
router.post('/', gameController_1.createGameController);
// GET /api/games/available - Lister les parties disponibles
router.get('/available', gameController_1.listAvailableGames);
// POST /api/games/join - Rejoindre une partie
router.post('/join', gameController_1.joinGame);
// GET /api/games/my-games - Lister les parties de l'utilisateur
router.get('/my-games', gameController_1.listUserGames);
// GET /api/games/:gameId - Obtenir les détails d'une partie
router.get('/:gameId', gameController_1.getGameDetails);
// POST /api/games/:gameId/move - Faire un mouvement
router.post('/:gameId/move', gameController_1.makeMove);
// POST /api/games/:gameId/roll - Lancer les dés
router.post('/:gameId/roll', gameController_1.rollDice);
// GET /api/games/:gameId/available-moves - Obtenir les mouvements possibles
router.get('/:gameId/available-moves', gameController_1.getAvailableMoves);
// GET /api/games/:gameId/pip-count - Obtenir le pip count
router.get('/:gameId/pip-count', gameController_1.getPipCount);
exports.default = router;
//# sourceMappingURL=games.js.map