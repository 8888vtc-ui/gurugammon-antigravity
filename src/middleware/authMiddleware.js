"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Middleware d'authentification
const authMiddleware = async (req, res, next) => {
    try {
        // Récupérer le token du header Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
        }
        // Extraire le token
        const token = authHeader.substring(7); // Supprimer "Bearer "
        // Vérifier le token
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Récupérer l'utilisateur depuis la base
        const user = await prisma.users.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                username: true
            }
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token. User not found.'
            });
        }
        // Ajouter l'utilisateur à la requête
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid token.'
        });
    }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=authMiddleware.js.map