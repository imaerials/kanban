import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Board, SearchResult } from '../types';
import { getBoard, getBoards, deleteBoard, searchBoardTasks } from '../api';
import { BoardView } from './BoardView';
import toast from 'react-hot-toast';

export function BoardViewPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!searchQuery.trim() || !boardId) {
      setSearchResults(null);
      setSearchOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchBoardTasks(boardId, searchQuery.trim());
        setSearchResults(results);
        setSearchOpen(true);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, boardId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
          <div className="search-bar" ref={searchRef}>
            <input
              className="search-input"
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults && setSearchOpen(true)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }}
            />
            {searchOpen && searchResults && (
              <div className="search-results">
                {searchResults.tasks.length === 0 ? (
                  <div className="search-no-results">No tasks found</div>
                ) : (
                  <>
                    {searchResults.tasks.map((t) => (
                      <div
                        key={t.id}
                        className="search-result-item"
                        onClick={() => {
                          navigate(`/board/${t.boardId}/task/${t.id}`);
                          setSearchOpen(false);
                          setSearchQuery('');
                        }}
                      >
                        <span className={`search-result-priority priority-${t.priority}`} />
                        <span className="search-result-title">{t.title}</span>
                        <span className="search-result-col">{t.columnTitle}</span>
                      </div>
                    ))}
                    {searchResults.total > searchResults.count && (
                      <div className="search-more">{searchResults.total - searchResults.count} more — refine your query</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
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
