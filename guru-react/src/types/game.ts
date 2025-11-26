export type PlayerColor = 'white' | 'black';

export interface PointState {
  pointIndex: number;
  checkers: { color: PlayerColor; count: number };
}

export interface Board {
  points: PointState[];
  bar: {
    white: number;
    black: number;
  };
  borneOff: {
    white: number;
    black: number;
  };
}

export interface GameState {
  board: Board;
  currentPlayer: PlayerColor;
  dice: [number, number];
  moves: number[];
  selectedChecker?: {
    pointIndex: number;
    color: PlayerColor;
  };
}
