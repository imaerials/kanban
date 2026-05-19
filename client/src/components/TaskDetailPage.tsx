import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TaskDetail } from '../types';
import { getTask, updateTask, deleteTask, addSubtask, toggleSubtask, deleteSubtask, addComment } from '../api';
import toast from 'react-hot-toast';

const priorityColors: Record<string, string> = {
  low: '#22c55e',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
};

export function TaskDetailPage() {
  const { taskId, boardId } = useParams<{ taskId: string; boardId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const loadTask = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const t = await getTask(taskId);
      setTask(t);
      setEditTitle(t.title);
      document.title = `${t.title} — Kanban`;
    } catch {
      toast.error('Task not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTask(); }, [taskId]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [editingTitle]);

  if (loading) return <div className="task-detail-page"><div className="loading">Loading...</div></div>;
  if (!task) return null;

  const tags = JSON.parse(task.tags || '[]') as string[];
  const completedCount = task.subtasks.filter((s) => s.completed).length;

  const handleSaveTitle = async () => {
    if (editTitle.trim() && editTitle !== task.title) {
      try {
        await updateTask(task.id, { title: editTitle.trim() } as any);
        setTask({ ...task, title: editTitle.trim() });
      } catch { toast.error('Failed to update title'); }
    }
    setEditingTitle(false);
  };

  const handleFieldChange = async (field: string, value: any) => {
    try {
      await updateTask(task.id, { [field]: value } as any);
      setTask({ ...task, [field]: value });
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task permanently?')) return;
    try {
      await deleteTask(task.id);
      toast.success('Task deleted');
      navigate(`/board/${boardId}`);
    } catch { toast.error('Failed to delete task'); }
  };

  const handleMove = async (columnId: string) => {
    try {
      await updateTask(task.id, { columnId } as any);
      setTask({ ...task, columnId });
      toast.success('Task moved');
    } catch { toast.error('Failed to move task'); }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    try {
      const st = await addSubtask(task.id, newSubtask.trim());
      setTask({ ...task, subtasks: [...task.subtasks, st] });
      setNewSubtask('');
    } catch { toast.error('Failed to add subtask'); }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    try {
      await toggleSubtask(subtaskId);
      setTask({
        ...task,
        subtasks: task.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, completed: s.completed ? 0 : 1 } : s
        ),
      });
    } catch { /* ok */ }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await deleteSubtask(subtaskId);
      setTask({ ...task, subtasks: task.subtasks.filter((s) => s.id !== subtaskId) });
    } catch { /* ok */ }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const c = await addComment(task.id, {
        content: newComment.trim(),
        author: commentAuthor.trim() || undefined,
      });
      setTask({ ...task, comments: [...task.comments, c] });
      setNewComment('');
    } catch { toast.error('Failed to add comment'); }
  };

  return (
    <div className="task-detail-page">
      <header className="detail-header">
        <button className="btn-back" onClick={() => navigate(`/board/${boardId}`)}>← Back to Board</button>
        {task.board && (
          <span className="detail-breadcrumb">
            <span className="board-name">{task.board.title}</span>
            {task.column && <span className="sep">›</span>}
            {task.column && <span className="col-name" style={{ color: task.column.color }}>{task.column.title}</span>}
          </span>
        )}
        <button className="btn-delete-task-detail" onClick={handleDelete}>🗑 Delete</button>
      </header>

      <div className="detail-content">
        <div className="detail-main">
          <div className="detail-title-row">
            <span
              className="priority-dot large"
              style={{ background: priorityColors[task.priority] || '#3b82f6' }}
              title={task.priority}
            ></span>
            {editingTitle ? (
              <input
                ref={titleInputRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
                className="detail-title-input"
              />
            ) : (
              <h1 className="detail-title" onDoubleClick={() => setEditingTitle(true)}>
                {task.title}
              </h1>
            )}
          </div>

          <div className="detail-meta">
            <div className="meta-field">
              <label>Type</label>
              <select
                value={task.storyType || 'task'}
                onChange={(e) => handleFieldChange('storyType', e.target.value)}
              >
                <option value="task">📋 Task</option>
                <option value="user_story">📖 User Story</option>
                <option value="bug">🐛 Bug</option>
              </select>
            </div>

            <div className="meta-field">
              <label>Priority</label>
              <select
                value={task.priority}
                onChange={(e) => handleFieldChange('priority', e.target.value)}
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🔵 Medium</option>
                <option value="high">🟠 High</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>

            <div className="meta-field">
              <label>Assignee</label>
              <input
                type="text"
                value={task.assignee || ''}
                onChange={(e) => handleFieldChange('assignee', e.target.value || null)}
                placeholder="Unassigned"
              />
            </div>

            <div className="meta-field">
              <label>Due Date</label>
              <input
                type="date"
                value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                onChange={(e) => handleFieldChange('dueDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </div>

            <div className="meta-field">
              <label>Created</label>
              <span className="meta-value">{new Date(task.createdAt).toLocaleString()}</span>
            </div>

            <div className="meta-field">
              <label>Updated</label>
              <span className="meta-value">{new Date(task.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          {task.description && (
            <div className="detail-description">
              <h3>Description</h3>
              <p>{task.description}</p>
            </div>
          )}

          {/* User Story section */}
          <div className="detail-story-section">
            <h3>
              {task.storyType === 'user_story' ? '📖' : task.storyType === 'bug' ? '🐛' : '📋'}
              {' '}{task.storyType === 'user_story' ? 'User Story' : task.storyType === 'bug' ? 'Bug Report' : 'Task'}
            </h3>

            <div className="story-fields">
              <div className="story-field">
                <label>As a (role)</label>
                <input
                  type="text"
                  value={task.storyRole || ''}
                  onChange={(e) => handleFieldChange('storyRole', e.target.value || null)}
                  placeholder="e.g. registered customer, admin, guest..."
                />
              </div>
              <div className="story-field">
                <label>I want to (goal)</label>
                <input
                  type="text"
                  value={task.storyGoal || ''}
                  onChange={(e) => handleFieldChange('storyGoal', e.target.value || null)}
                  placeholder="e.g. filter products by category..."
                />
              </div>
              <div className="story-field">
                <label>So that (benefit / value)</label>
                <input
                  type="text"
                  value={task.storyBenefit || ''}
                  onChange={(e) => handleFieldChange('storyBenefit', e.target.value || null)}
                  placeholder="e.g. I can find what I need faster..."
                />
              </div>

              <div className="story-points-row">
                <span className="story-points-label">Story Points</span>
                <div className="story-points-options">
                  {[1, 2, 3, 5, 8, 13, 21].map((pts) => (
                    <button
                      key={pts}
                      className={`story-pt-btn ${task.storyPoints === pts ? 'selected' : ''}`}
                      onClick={() => handleFieldChange('storyPoints', task.storyPoints === pts ? null : pts)}
                    >
                      {pts}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Rendered user story */}
            {task.storyType === 'user_story' && task.storyRole && (
              <div className="user-story-card">
                <div className="story-label">Preview</div>
                <p>
                  <strong>As a</strong> {task.storyRole},<br />
                  <strong>I want to</strong> {task.storyGoal || '…'}<br />
                  {task.storyBenefit && <><strong>So that</strong> {task.storyBenefit}</>}
                </p>
                {task.storyPoints != null && (
                  <div className="story-meta-row">
                    <span className="story-points-badge">{task.storyPoints} story points</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {tags.length > 0 && (
            <div className="detail-tags">
              <h3>Tags</h3>
              <div className="tags">
                {tags.map((tag, i) => (
                  <span key={i} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks */}
          <div className="detail-subtasks">
            <h3>
              Subtasks ({completedCount}/{task.subtasks.length})
            </h3>
            {task.subtasks.length > 0 && (
              <div className="subtask-progress-bar">
                <div
                  className="subtask-progress-fill"
                  style={{
                    width: `${task.subtasks.length > 0 ? (completedCount / task.subtasks.length) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            )}
            <div className="subtasks">
              {task.subtasks.map((st) => (
                <div key={st.id} className={`subtask ${st.completed ? 'done' : ''}`}>
                  <input
                    type="checkbox"
                    checked={!!st.completed}
                    onChange={() => handleToggleSubtask(st.id)}
                  />
                  <span>{st.title}</span>
                  <button onClick={() => handleDeleteSubtask(st.id)}>✕</button>
                </div>
              ))}
            </div>
            <div className="new-subtask">
              <input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask(); }}
                placeholder="+ Add subtask..."
              />
            </div>
          </div>
        </div>

        <aside className="detail-sidebar">
          {/* Comments */}
          <div className="detail-comments">
            <h3>💬 Comments ({task.comments.length})</h3>
            {task.comments.map((c) => (
              <div key={c.id} className="comment">
                <div className="comment-header">
                  <strong>{c.author}</strong>
                  <span className="comment-date">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="comment-content">{c.content}</p>
              </div>
            ))}
            <div className="new-comment">
              <input
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
                placeholder="Your name..."
                className="comment-author-input"
              />
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder="Write a comment... (Enter to send, Shift+Enter for new line)"
                rows={3}
              />
              <button onClick={handleAddComment} className="btn-add-comment">
                Send
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
