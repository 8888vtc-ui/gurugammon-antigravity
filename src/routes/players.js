"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/players.ts
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// GET /api/players
router.get('/', async (req, res) => {
    try {
        const players = await prisma.users.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                elo: true,
                level: true
            }
        });
        res.json({
            success: true,
            data: players
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch players'
        });
    }
});
// POST /api/players - DISABLED: Use /api/auth/register instead
/*
router.post('/', async (req, res) => {
  const { username, email } = req.body;
  
  try {
    const newPlayer = await prisma.users.create({
      data: { username, email }
    });
    
    res.status(201).json({
      success: true,
      data: newPlayer
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Failed to create player'
    });
  }
});
*/
// DELETE /api/players/:id - DISABLED: Security risk
/*
router.delete('/:id', async (req, res) => {
  const playerId = req.params.id;
  
  try {
    const deletedPlayer = await prisma.users.delete({
      where: { id: playerId }
    });
    
    res.json({
      success: true,
      data: deletedPlayer
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'Player not found'
    });
  }
});
*/
exports.default = router;
//# sourceMappingURL=players.js.map