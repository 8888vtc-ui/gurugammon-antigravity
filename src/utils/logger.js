"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
// src/utils/logger.ts
class Logger {
    context;
    constructor(context) {
        this.context = context;
    }
    info(message, data) {
        console.log(`[${new Date().toISOString()}] [${this.context}] INFO: ${message}`, data || '');
    }
    error(message, error) {
        console.error(`[${new Date().toISOString()}] [${this.context}] ERROR: ${message}`, error || '');
    }
    warn(message, data) {
        console.warn(`[${new Date().toISOString()}] [${this.context}] WARN: ${message}`, data || '');
    }
}
exports.Logger = Logger;
// Export par défaut
exports.logger = new Logger('GammonGuru');
//# sourceMappingURL=logger.js.map