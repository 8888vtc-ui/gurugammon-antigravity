"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerMiddleware = loggerMiddleware;
const logger_1 = require("../utils/logger");
function loggerMiddleware(req, res, next) {
    const start = Date.now();
    // Log la requête entrante
    logger_1.logger.info(`➡◾ ${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    // Hook sur la fin de la réponse
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger_1.logger.info(`⬅◾ ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    next();
}
//# sourceMappingURL=loggerMiddleware.js.map