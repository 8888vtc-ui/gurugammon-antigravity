import './MoveHistory.css';
import type { MoveRecord } from '../../types';

interface MoveHistoryProps {
  moves: MoveRecord[];
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  return (
    <div className="move-history">
      <div className="move-history-header">Historique des coups</div>
      {moves.length === 0 ? (
        <div className="move-history-empty">Aucun coup joué pour le moment.</div>
      ) : (
        <ol className="move-history-list">
          {moves.map((move, index) => (
            <li
              key={index}
              className={`move-history-item move-${move.player}`}
            >
              <span className="move-index">{index + 1}.</span>
              <span className="move-player">{move.player === 'white' ? 'Blanc' : 'Noir'}</span>
              <span className="move-notation">{move.notation}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
