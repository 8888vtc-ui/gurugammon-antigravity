"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
const express = require('express');
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const loggerMiddleware_1 = require("./middleware/loggerMiddleware");
const errorHandlerMiddleware_1 = require("./middleware/errorHandlerMiddleware");
const securityMiddleware_1 = require("./middleware/securityMiddleware");
const players_1 = __importDefault(require("./routes/players"));
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const games_1 = __importDefault(require("./routes/games"));
const gnubg_1 = __importDefault(require("./routes/gnubg"));
const gnubgDebug_1 = __importDefault(require("./routes/gnubgDebug"));
const app = express();
// Middleware de base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Middleware de sécurité
app.use((0, securityMiddleware_1.helmet)());
app.use((0, securityMiddleware_1.cors)(securityMiddleware_1.corsOptions));
app.use(securityMiddleware_1.generalLimiter);
// Middleware personnalisé
app.use(loggerMiddleware_1.loggerMiddleware);
// Routes
app.use('/api/players', players_1.default);
app.use('/api/auth', securityMiddleware_1.authLimiter, auth_1.default); // Rate limiting strict pour auth
app.use('/api/user', user_1.default);
app.use('/api/games', games_1.default);
app.use('/api/gnubg', gnubg_1.default);
app.use('/api/gnubg-debug', gnubgDebug_1.default);
// Route de santé
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// Route racine
app.get('/', (req, res) => {
    res.json({
        message: 'GammonGuru API',
        version: '1.0.0',
        endpoints: [
            'GET /health',
            'GET /api/players',
            'POST /api/players'
        ]
    });
});
// Middleware de gestion d'erreurs
app.use(errorHandlerMiddleware_1.errorHandlerMiddleware);
// Démarrage du serveur
app.listen(config_1.config.port, () => {
    logger_1.logger.info(`Server running on port ${config_1.config.port}`);
    logger_1.logger.info(`Environment: ${config_1.config.nodeEnv}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map