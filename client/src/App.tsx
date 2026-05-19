import { useState, useEffect } from 'react';
import { BoardListItem } from './types';
import { getBoards, createBoard, deleteBoard } from './api';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

export default function App() {
  const [boards, setBoards] = useState<BoardListItem[]>([]);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const navigate = useNavigate();

  useEffect(() => { loadBoards(); }, []);

  const loadBoards = async () => {
    try {
      const b = await getBoards();
      setBoards(b);
    } catch {
      toast.error('Failed to load boards');
    }
  };

  const handleCreateBoard = async () => {
    if (!newTitle.trim()) return;
    try {
      const board = await createBoard({ title: newTitle.trim() });
      setBoards((prev) => [...prev, {
        id: board.id, title: board.title, description: board.description,
        createdAt: board.createdAt, updatedAt: board.updatedAt,
      }]);
      setNewTitle('');
      setShowNewBoard(false);
      navigate(`/board/${board.id}`);
      toast.success('Board created!');
    } catch {
      toast.error('Failed to create board');
    }
  };

  const handleDeleteBoard = async (id: string) => {
    if (!confirm('Delete this board?')) return;
    try {
      await deleteBoard(id);
      setBoards((prev) => prev.filter((b) => b.id !== id));
      toast.success('Board deleted');
    } catch {
      toast.error('Failed to delete board');
    }
  };

  return (
    <div className="app">
      <Toaster position="top-right" />
      <header className="app-header">
        <div className="header-left">
          <h1>🦞 Kanban</h1>
        </div>
        <div className="header-center">
          {showNewBoard ? (
            <div className="new-board-form">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateBoard();
                  if (e.key === 'Escape') setShowNewBoard(false);
                }}
                placeholder="Board name..."
              />
              <button onClick={handleCreateBoard}>✓</button>
              <button onClick={() => setShowNewBoard(false)}>✕</button>
            </div>
          ) : (
            <button className="btn-new-board" onClick={() => setShowNewBoard(true)}>+ Board</button>
          )}
        </div>
        <div className="header-right"></div>
      </header>
      <main>
        <div className="home-page">
          <h2>Boards</h2>
          {boards.length === 0 && (
            <p className="text-muted">No boards yet. Create one to get started.</p>
          )}
          <div className="board-grid">
            {boards.map((b) => (
              <div
                key={b.id}
                className="board-card"
                onClick={() => navigate(`/board/${b.id}`)}
                onContextMenu={(e) => { e.preventDefault(); handleDeleteBoard(b.id); }}
              >
                <h3>{b.title}</h3>
                {b.description && <p>{b.description}</p>}
                <span className="board-date">
                  {new Date(b.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
