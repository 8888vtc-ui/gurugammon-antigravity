import { useState, useCallback, useEffect } from 'react';
import { INITIAL_BOARD } from '../types';
import type { GameState } from '../types';
import { apiClient } from '../api/client';

type BackendBoardState = {
  positions: number[];
  whiteBar: number;
  blackBar: number;
  whiteOff: number;
  blackOff: number;
};

type BackendDiceState = {
  dice: [number, number];
  remaining: number[];
  doubles: boolean;
  used: boolean[];
};

type BackendGameState = {
  board: BackendBoardState;
  currentPlayer: 'white' | 'black';
  dice: BackendDiceState;
};

type GameApiResponse =
  | { success: boolean; data: { game: BackendGameState } }
  | { game: BackendGameState }
  | BackendGameState;

export type UseBackgammonOptions = {
  /** Identifiant de partie backend. S'il est absent, le hook fonctionne en mode local uniquement. */
  gameId?: string | number | null;
};

const createLocalInitialState = (): GameState => ({
  board: {
    points: [...INITIAL_BOARD],
    whiteBar: 0,
    blackBar: 0,
    whiteOff: 0,
    blackOff: 0
  },
  currentPlayer: 'white',
  dice: [],
  selectedPoint: null,
  validMoves: [],
  winner: null,
  lastMove: null,
  hintMove: null,
  moveHistory: []
});

const determineWinnerFromBoard = (board: BackendBoardState): 'white' | 'black' | null => {
  if (board.whiteOff === 15) return 'white';
  if (board.blackOff === 15) return 'black';
  return null;
};

const extractBackendGame = (response: GameApiResponse): BackendGameState => {
  const anyResp = response as any;
  if (anyResp?.data?.game) return anyResp.data.game;
  if (anyResp?.game) return anyResp.game;
  return anyResp as BackendGameState;
};

const mapBackendGameToLocal = (backend: BackendGameState): GameState => {
  const board = backend.board;
  const dice = backend.dice?.remaining?.length ? backend.dice.remaining : backend.dice?.dice ?? [];

  return {
    board: {
      points: [...board.positions],
      whiteBar: board.whiteBar,
      blackBar: board.blackBar,
      whiteOff: board.whiteOff,
      blackOff: board.blackOff
    },
    currentPlayer: backend.currentPlayer,
    dice,
    selectedPoint: null,
    validMoves: [],
    winner: determineWinnerFromBoard(board),
    lastMove: null,
    hintMove: null,
    moveHistory: []
  };
};

export const useBackgammon = (options?: UseBackgammonOptions) => {
  const gameId = options?.gameId ?? null;

  const [gameState, setGameState] = useState<GameState>(createLocalInitialState);
  const [error, setError] = useState<string | null>(null);

  // Charger l'état initial depuis le backend si un gameId est fourni
  useEffect(() => {
    if (!gameId) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        setError(null);
        const response = await apiClient.getGameStatus<GameApiResponse>(gameId, { signal: controller.signal });
        if (cancelled) return;
        const backendGame = extractBackendGame(response);
        setGameState(mapBackendGameToLocal(backendGame));
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Erreur lors du chargement de la partie.';
        setError(message);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [gameId]);

  const rollDice = useCallback(async () => {
    // Mode backend : déléguer à l'API
    if (gameId) {
      try {
        setError(null);
        const response = await apiClient.rollDice<GameApiResponse>(gameId);
        const backendGame = extractBackendGame(response);
        setGameState(mapBackendGameToLocal(backendGame));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors du lancer de dés.';
        setError(message);
      }
      return;
    }

    // Mode local (fallback sans backend)
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const newDice = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];

    setGameState(prev => ({
      ...prev,
      dice: newDice,
      selectedPoint: null,
      validMoves: []
    }));
  }, [gameId]);

  const sendMoveToBackend = useCallback(
    async (from: number, to: number) => {
      if (!gameId) return;

      // Approximation : on utilise la distance comme valeur de dé; le backend validera ou rejettera.
      const diceUsed = Math.abs(to - from);

      try {
        setError(null);
        const response = await apiClient.makeMove<GameApiResponse>(gameId, { from, to, diceUsed });
        const backendGame = extractBackendGame(response);
        setGameState(mapBackendGameToLocal(backendGame));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors de la tentative de coup.';
        setError(message);

        // Tenter de resynchroniser l'état local avec le backend
        try {
          const statusResponse = await apiClient.getGameStatus<GameApiResponse>(gameId);
          const backendGame = extractBackendGame(statusResponse);
          setGameState(mapBackendGameToLocal(backendGame));
        } catch {
          // on ignore une éventuelle seconde erreur
        }
      }
    },
    [gameId]
  );

  const requestHint = useCallback(async () => {
    if (!gameId) {
      setError('Les suggestions IA nécessitent une partie en ligne (gameId).');
      return;
    }

    try {
      setError(null);
      // Effacer une éventuelle suggestion précédente avant de demander la suivante
      setGameState(prev => ({
        ...prev,
        hintMove: null
      }));

      const response = await apiClient.getSuggestions<any>(gameId);
      const anyResp = response as any;
      const suggestion = anyResp?.data?.suggestion ?? anyResp?.suggestion ?? null;
      const move = suggestion?.move;

      if (move && typeof move.from === 'number' && typeof move.to === 'number') {
        setGameState(prev => ({
          ...prev,
          hintMove: { from: move.from, to: move.to }
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la demande de suggestion IA.';
      setError(message);
    }
  }, [gameId]);

  const handlePointClick = useCallback(
    (pointIndex: number) => {
      // Mode backend : envoyer les coups au serveur
      if (gameId) {
        setGameState(prev => {
          // Si aucun état ou aucun dé, on ne fait rien
          if (!prev || prev.dice.length === 0) return prev;

          const { board, currentPlayer, selectedPoint } = prev;
          const clickedPointCount = board.points[pointIndex];

          // Première sélection : vérifier que la case appartient au joueur courant
          if (selectedPoint === null) {
            const isPlayerPiece = currentPlayer === 'white' ? clickedPointCount > 0 : clickedPointCount < 0;
            if (!isPlayerPiece) {
              return prev;
            }

            return {
              ...prev,
              selectedPoint: pointIndex,
              validMoves: []
            };
          }

          // Cliquer à nouveau sur la même case désélectionne
          if (selectedPoint === pointIndex) {
            return {
              ...prev,
              selectedPoint: null,
              validMoves: []
            };
          }

          // Tenter un coup depuis selectedPoint vers pointIndex
          void sendMoveToBackend(selectedPoint, pointIndex);

          return {
            ...prev,
            selectedPoint: null,
            validMoves: []
          };
        });

        return;
      }

      // Mode local (comportement précédent)
      setGameState(prev => {
        // Si aucun dé, on ne fait rien
        if (prev.dice.length === 0) return prev;

        const { board, currentPlayer, selectedPoint } = prev;
        const clickedPointCount = board.points[pointIndex];

        // 1. Sélectionner un pion
        if (selectedPoint === null) {
          // Vérifier si le point appartient au joueur courant
          const isPlayerPiece = currentPlayer === 'white' ? clickedPointCount > 0 : clickedPointCount < 0;

          if (isPlayerPiece) {
            // Calculer les mouvements possibles basiques avec les dés disponibles
            // Blanc joue vers 1 (indices décroissants), Noir vers 24 (indices croissants)
            const direction = currentPlayer === 'white' ? -1 : 1;

            const possibleDestinations = [...new Set(prev.dice)]
              .map(die => pointIndex + die * direction)
              .filter(dest => dest >= 0 && dest <= 23); // TODO: Gérer la sortie (bearing off)

            return {
              ...prev,
              selectedPoint: pointIndex,
              validMoves: possibleDestinations
            };
          }
          return prev;
        }

        // 2. Déplacer le pion (Si on clique sur une destination valide)
        if (prev.validMoves.includes(pointIndex)) {
          const moveDistance = Math.abs(pointIndex - selectedPoint);
          // Trouver quel dé a été utilisé
          const dieIndex = prev.dice.findIndex(d => d === moveDistance);

          if (dieIndex === -1) {
            // Fallback si mouvement combiné ou autre (simplifié ici)
            return { ...prev, selectedPoint: null, validMoves: [] };
          }

          // Mettre à jour le board
          const newPoints = [...board.points];
          // Enlever du départ
          newPoints[selectedPoint] = currentPlayer === 'white' ? newPoints[selectedPoint] - 1 : newPoints[selectedPoint] + 1;

          // Ajouter à l'arrivée (Gérer la prise/hit plus tard)
          const targetCount = newPoints[pointIndex];
          // Si hit
          if ((currentPlayer === 'white' && targetCount === -1) || (currentPlayer === 'black' && targetCount === 1)) {
            // Hit logic here (envoyer à la barre)
            newPoints[pointIndex] = currentPlayer === 'white' ? 1 : -1;
            // TODO: Incrémenter bar adverse
          } else {
            newPoints[pointIndex] = currentPlayer === 'white' ? newPoints[pointIndex] + 1 : newPoints[pointIndex] - 1;
          }

          const newDice = [...prev.dice];
          newDice.splice(dieIndex, 1);

          const nextPlayer = newDice.length === 0 ? (currentPlayer === 'white' ? 'black' : 'white') : currentPlayer;

          const fromIndex = selectedPoint;
          const toIndex = pointIndex;
          const notation = `${fromIndex + 1}/${toIndex + 1}`;

          return {
            ...prev,
            board: { ...board, points: newPoints },
            dice: newDice,
            currentPlayer: nextPlayer,
            selectedPoint: null,
            validMoves: [],
            lastMove: { from: selectedPoint, to: pointIndex },
            moveHistory: [
              ...prev.moveHistory,
              {
                player: currentPlayer,
                from: fromIndex,
                to: toIndex,
                notation
              }
            ]
          };
        }

        // Désélectionner si on clique ailleurs ou sur le même
        return {
          ...prev,
          selectedPoint: null,
          validMoves: []
        };
      });
    },
    [gameId, sendMoveToBackend]
  );

  return {
    gameState,
    rollDice,
    handlePointClick,
    requestHint,
    error
  };
};
