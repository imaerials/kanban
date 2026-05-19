import { useState, useEffect } from 'react';
import { Task, TaskComment, Column } from '../types';
import { updateTask, deleteTask, addSubtask, toggleSubtask, deleteSubtask, getComments, addComment, moveTask } from '../api';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Props {
  task: Task;
  onUpdate: () => void;
  allColumns: Column[];
}

const priorityColors: Record<string, string> = {
  low: '#22c55e',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
};

export function TaskCard({ task, onUpdate, allColumns }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [newSubtask, setNewSubtask] = useState('');
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();

  useEffect(() => {
    if (expanded) {
      getComments(task.id).then(setComments).catch(() => {});
    }
  }, [expanded, task.id]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleSave = async () => {
    if (editTitle.trim() && editTitle !== task.title) {
      try {
        await updateTask(task.id, { title: editTitle.trim() } as Partial<Task>);
        onUpdate();
      } catch (e) { toast.error('Failed to update task'); }
    }
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTask(task.id);
      onUpdate();
    } catch (e) { toast.error('Failed to delete task'); }
  };

  const handleColumnChange = async (newColumnId: string) => {
    if (newColumnId === task.columnId) return;
    try {
      // Move task to end of target column
      const targetCol = allColumns.find((c) => c.id === newColumnId);
      const newPosition = targetCol ? targetCol.tasks.length : 0;
      await moveTask(task.id, {
        columnId: newColumnId,
        position: newPosition,
        taskIds: [],
      });
      toast.success(`Moved to column`);
      onUpdate();
    } catch (e) {
      toast.error('Failed to move task');
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    try {
      await addSubtask(task.id, newSubtask.trim());
      setNewSubtask('');
      onUpdate();
    } catch (e) { toast.error('Failed to add subtask'); }
  };

  const handleToggleSubtask = async (id: string) => {
    try {
      await toggleSubtask(id);
      onUpdate();
    } catch (e) { /* no toast, it's minor */ }
  };

  const handleDeleteSubtask = async (id: string) => {
    try {
      await deleteSubtask(id);
      onUpdate();
    } catch (e) { /* no toast */ }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const c = await addComment(task.id, {
        content: newComment.trim(),
        author: commentAuthor.trim() || undefined,
      });
      setComments([...comments, c]);
      setNewComment('');
    } catch (e) { toast.error('Failed to add comment'); }
  };

  const completedCount = task.subtasks.filter((s) => s.completed).length;
  const tags = JSON.parse(task.tags || '[]') as string[];

  return (
    <div ref={setNodeRef} style={style} className="task-card" {...attributes}>
      <div className="task-header" {...listeners}>
        <span
          className="priority-dot"
          style={{ background: priorityColors[task.priority] || '#3b82f6' }}
          title={task.priority}
        ></span>
        {editing ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            className="task-title-input"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h4 onClick={(e) => { e.stopPropagation(); navigate(`/board/${boardId}/task/${task.id}`); }} style={{ cursor: 'pointer' }} title="Open task details">{task.title}</h4>
        )}

        <div className="task-actions">
          <select
            className="task-col-select"
            value={task.columnId}
            onChange={(e) => {
              e.stopPropagation();
              handleColumnChange(e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            title="Move to column"
          >
            {allColumns.map((col) => (
              <option key={col.id} value={col.id}>
                {col.id === task.columnId ? '📌 ' : ''}{col.title}
              </option>
            ))}
          </select>
          <button onClick={() => setExpanded(!expanded)} className="btn-expand">
            {expanded ? '▲' : '▼'}
          </button>
          <button onClick={handleDelete} className="btn-delete-task">✕</button>
        </div>
      </div>

      {/* User Story preview below title */}
      {task.storyType === 'user_story' && task.storyRole && (
        <div
          className="task-story-preview"
          onClick={(e) => { e.stopPropagation(); navigate(`/board/${boardId}/task/${task.id}`); }}
          style={{ cursor: 'pointer' }}
        >
          <em>
            As a <strong>{task.storyRole}</strong>, I want to <strong>{task.storyGoal || '…'}</strong>
            {task.storyBenefit && <> so that <strong>{task.storyBenefit}</strong></>}
          </em>
          {task.storyPoints != null && (
            <span className="story-points-badge">{task.storyPoints} pts</span>
          )}
        </div>
      )}

      {task.subtasks.length > 0 && !expanded && (
        <div className="task-meta">
          <span className="subtask-progress">
            {completedCount}/{task.subtasks.length} done
          </span>
        </div>
      )}

      {expanded && (
        <div className="task-detail">
          {task.description && <p className="task-desc">{task.description}</p>}

          <div className="task-fields">
            <select
              value={task.priority}
              onChange={async (e) => {
                await updateTask(task.id, { priority: e.target.value } as Partial<Task>);
                onUpdate();
              }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <input
              type="text"
              value={task.assignee || ''}
              onChange={async (e) => {
                await updateTask(task.id, { assignee: e.target.value || null } as Partial<Task>);
                onUpdate();
              }}
              placeholder="Assignee..."
            />

            {task.dueDate && (
              <span className="due-date">
                📅 {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>

          {tags.length > 0 && (
            <div className="tags">
              {tags.map((tag, i) => (
                <span key={i} className="tag">{tag}</span>
              ))}
            </div>
          )}

          <div className="comments-section">
            <h5>💬 Comments ({comments.length})</h5>
            {comments.map((c) => (
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
                rows={2}
              />
              <button onClick={handleAddComment} className="btn-add-comment">
                Send
              </button>
            </div>
          </div>

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
      )}
    </div>
  );
}
