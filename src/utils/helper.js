"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Helper = void 0;
// src/utils/helper.ts
class Helper {
    // Générer un ID unique
    static generateId() {
        // TODO : utilise crypto.randomUUID()
        return crypto.randomUUID();
    }
    // Formater une date
    static formatDate(date) {
        // TODO : formate la date en YYYY-MM-DD
        return date.toISOString().split('T')[0] || '';
    }
    // Calculer le temps écoulé
    static timeAgo(date) {
        // TODO : calcule le temps depuis la date
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60)
            return `${seconds} seconds ago`;
        if (seconds < 3600)
            return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400)
            return `${Math.floor(seconds / 3600)} hours ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    }
    // Arrondir un nombre
    static round(num, decimals = 2) {
        // TODO : arrondit le nombre avec décimales
        return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
}
exports.Helper = Helper;
//# sourceMappingURL=helper.js.map