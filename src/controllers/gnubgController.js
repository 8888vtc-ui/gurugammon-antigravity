"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkInstallation = exports.analyzeGame = exports.evaluatePosition = exports.getHint = void 0;
const gnubgRunner_1 = require("../services/gnubgRunner");
// Obtenir une suggestion de mouvement
const getHint = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        const { board, dice } = req.body;
        // Validation
        if (!board || !dice) {
            return res.status(400).json({
                success: false,
                error: 'Board and dice are required'
            });
        }
        if (!Array.isArray(dice) || dice.length !== 2) {
            return res.status(400).json({
                success: false,
                error: 'Dice must be an array of 2 values'
            });
        }
        // Obtenir la suggestion de GNUBG
        const hint = await gnubgRunner_1.GNUBGRunner.getHint(board, dice);
        res.json({
            success: true,
            data: hint
        });
    }
    catch (error) {
        console.error('GNUBG hint error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get hint from GNUBG'
        });
    }
};
exports.getHint = getHint;
// Évaluer une position
const evaluatePosition = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        const { board } = req.body;
        // Validation
        if (!board) {
            return res.status(400).json({
                success: false,
                error: 'Board is required'
            });
        }
        // Évaluer la position avec GNUBG
        const evaluation = await gnubgRunner_1.GNUBGRunner.evaluatePosition(board);
        res.json({
            success: true,
            data: evaluation
        });
    }
    catch (error) {
        console.error('GNUBG evaluation error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to evaluate position'
        });
    }
};
exports.evaluatePosition = evaluatePosition;
// Analyser une partie complète
const analyzeGame = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        const { moves } = req.body;
        // Validation
        if (!moves || !Array.isArray(moves)) {
            return res.status(400).json({
                success: false,
                error: 'Moves array is required'
            });
        }
        // Analyser la partie avec GNUBG
        const analysis = await gnubgRunner_1.GNUBGRunner.analyzeGame(moves);
        res.json({
            success: true,
            data: analysis
        });
    }
    catch (error) {
        console.error('GNUBG analysis error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to analyze game'
        });
    }
};
exports.analyzeGame = analyzeGame;
// Vérifier l'installation de GNUBG
const checkInstallation = async (req, res) => {
    try {
        const isInstalled = await gnubgRunner_1.GNUBGRunner.checkInstallation();
        res.json({
            success: true,
            data: {
                installed: isInstalled,
                message: isInstalled ? 'GNUBG is properly installed' : 'GNUBG is not installed or not in PATH'
            }
        });
    }
    catch (error) {
        console.error('GNUBG check error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check GNUBG installation'
        });
    }
};
exports.checkInstallation = checkInstallation;
//# sourceMappingURL=gnubgController.js.map