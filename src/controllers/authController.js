"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const cuid2_1 = require("@paralleldrive/cuid2");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Inscription
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Validation basique
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Name, email and password are required'
            });
        }
        // Vérifier si l'utilisateur existe
        const existingPlayer = await prisma.users.findUnique({
            where: { email }
        });
        if (existingPlayer) {
            return res.status(400).json({
                success: false,
                error: 'User already exists'
            });
        }
        // Hasher le mot de passe
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Créer l'utilisateur
        const player = await prisma.users.create({
            data: {
                id: (0, cuid2_1.createId)(),
                username: name,
                email,
                password: hashedPassword
            }
        });
        // Générer token
        const token = jsonwebtoken_1.default.sign({ userId: player.id, email: player.email }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: player.id,
                    name: player.username,
                    email: player.email
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Registration failed'
        });
    }
};
exports.register = register;
// Connexion
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validation basique
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        // Trouver l'utilisateur
        const player = await prisma.users.findUnique({
            where: { email }
        });
        if (!player || !player.password) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // Vérifier le mot de passe
        const isValidPassword = await bcryptjs_1.default.compare(password, player.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // Générer token
        const token = jsonwebtoken_1.default.sign({ userId: player.id, email: player.email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: player.id,
                    name: player.username,
                    email: player.email
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
};
exports.login = login;
// Logout (côté client - suppression du token)
const logout = async (req, res) => {
    // Dans une implémentation simple, le logout est géré côté client
    // en supprimant le token stocké localement
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
};
exports.logout = logout;
//# sourceMappingURL=authController.js.map