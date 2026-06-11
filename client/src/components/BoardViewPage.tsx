import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Board } from '../types';
import { getBoard, getBoards, deleteBoard } from '../api';
import { BoardView } from './BoardView';
import toast from 'react-hot-toast';

export function BoardViewPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<any[]>([]);

  const loadBoard = async () => {
    if (!boardId) return;
    setLoading(true);
    try {
      const b = await getBoard(boardId);
      setBoard(b);
      document.title = `${b.title} — Kanban`;
      // Also load boards list for tabs
      getBoards().then(setBoards).catch(() => {});
    } catch {
      toast.error('Board not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBoard(); }, [boardId]);

  const handleDeleteBoard = async (id: string) => {
    if (!confirm('Delete this board?')) return;
    try {
      await deleteBoard(id);
      setBoards((prev) => prev.filter((b) => b.id !== id));
      if (board?.id === id) navigate('/');
      toast.success('Board deleted');
    } catch {
      toast.error('Failed to delete board');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!board) return null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>🦞 Kanban</h1>
        </div>
        <div className="header-center">
          {boards.map((b) => (
            <button
              key={b.id}
              className={`board-tab ${board.id === b.id ? 'active' : ''}`}
              onClick={() => { navigate(`/board/${b.id}`); }}
              onContextMenu={(e) => { e.preventDefault(); handleDeleteBoard(b.id); }}
            >
              {b.title}
            </button>
          ))}
          <button className="btn-new-board" onClick={() => navigate('/')}>+ Board</button>
        </div>
        <div className="header-right">
          {board && (
            <>
              <button onClick={loadBoard} className="btn-refresh">↻ Refresh</button>
              <button
                onClick={() => handleDeleteBoard(board.id)}
                className="btn-delete-board"
                title="Delete this board"
              >
                🗑 Delete Board
              </button>
            </>
          )}
        </div>
      </header>
      <main>
        <BoardView board={board} onUpdate={loadBoard} />
      </main>
    </div>
  );
}
