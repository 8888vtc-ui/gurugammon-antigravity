// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';
import { config } from '../config';

interface JwtUserPayload extends jwt.JwtPayload {
  userId: string;
}

// Interface pour étendre Request
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

// Middleware d'authentification
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!config.accessTokenSecret) {
      res.status(500).json({
        success: false,
        error: 'Authentication service misconfigured.'
      });
      return;
    }

    // Récupérer le token du header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
      return;
    }

    // Extraire le token
    const token = authHeader.substring(7); // Supprimer "Bearer "

    // Vérifier le token
    let decodedToken: string | JwtUserPayload;
    try {
      decodedToken = jwt.verify(token, config.accessTokenSecret) as string | JwtUserPayload;
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid token.'
      });
      return;
    }

    if (typeof decodedToken !== 'object' || !('userId' in decodedToken) || !decodedToken.userId) {
      res.status(401).json({
        success: false,
        error: 'Invalid token payload.'
      });
      return;
    }
    
    // Récupérer l'utilisateur depuis la base
    const user = await prisma.users.findUnique({
      where: { id: decodedToken.userId },
      select: {
        id: true,
        email: true,
        username: true
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid token. User not found.'
      });
      return;
    }

    // Ajouter l'utilisateur à la requête
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username ?? 'anonymous'
    };
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token.'
    });
    return;
  }
};
