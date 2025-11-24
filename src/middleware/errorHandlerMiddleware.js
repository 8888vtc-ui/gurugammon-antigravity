"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandlerMiddleware = errorHandlerMiddleware;
const logger_1 = require("../utils/logger");
function errorHandlerMiddleware(err, req, res, next) {
    // Log l'erreur principale
    logger_1.logger.error(`🚨 ${err.message}`);
    // Log les détails séparément
    logger_1.logger.info('Error details', {
        url: req.originalUrl,
        method: req.method,
        stack: err.stack
    });
    // Réponse standardisée
    const status = err.status || 500;
    res.status(status).json({
        error: {
            message: err.message || 'Internal Server Error',
            code: err.code || 'UNKNOWN_ERROR',
            timestamp: new Date().toISOString()
        }
    });
}
//# sourceMappingURL=errorHandlerMiddleware.js.map