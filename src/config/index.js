"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
// src/config/index.ts
exports.config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    apiPrefix: '/api',
    corsOrigin: process.env.CORS_ORIGIN || '*'
};
//# sourceMappingURL=index.js.map