import { useState } from 'react';
import { Column as ColumnType } from '../types';
import { createTask, updateColumn, deleteColumn } from '../api';
import { TaskCard } from './TaskCard';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import toast from 'react-hot-toast';

interface Props {
  column: ColumnType;
  onUpdate: () => void;
  allColumns: ColumnType[];
}

export function Column({ column, onUpdate, allColumns }: Props) {
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: column.id });

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      await createTask(column.id, {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || undefined,
      });
      setNewTaskTitle('');
      setNewTaskDesc('');
      setShowNewTask(false);
      onUpdate();
    } catch (e) {
      toast.error('Failed to add task');
    }
  };

  const handleSaveTitle = async () => {
    if (editTitle.trim() && editTitle !== column.title) {
      try {
        await updateColumn(column.id, { title: editTitle.trim() });
        onUpdate();
      } catch (e) {
        toast.error('Failed to update column');
      }
    }
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete column "${column.title}" and all its tasks?`)) return;
    try {
      await deleteColumn(column.id);
      onUpdate();
      toast.success('Column deleted');
    } catch (e) {
      toast.error('Failed to delete column');
    }
  };

  return (
    <div className={`column ${isOver ? 'drop-over' : ''}`} style={{ borderTopColor: column.color }} ref={setDroppableRef}>
      <div className="column-header">
        {editing ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditing(false); }}
            className="column-title-input"
          />
        ) : (
          <h3 onDoubleClick={() => setEditing(true)}>
            <span className="col-color" style={{ background: column.color }}></span>
            {column.title}
          </h3>
        )}
        <span className="task-count">{column.tasks.length}</span>
        <button className="btn-delete-col" onClick={handleDelete} title="Delete column">🗑</button>
      </div>

      <SortableContext
        items={column.tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="task-list">
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onUpdate={onUpdate} allColumns={allColumns} />
          ))}
        </div>
      </SortableContext>

      {showNewTask ? (
        <div className="new-task-form">
          <input
            autoFocus
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddTask(); }
              if (e.key === 'Escape') setShowNewTask(false);
            }}
            placeholder="Task title..."
            className="new-task-title-input"
          />
          <textarea
            value={newTaskDesc}
            onChange={(e) => setNewTaskDesc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowNewTask(false);
            }}
            placeholder="Description (optional)..."
            rows={2}
            className="new-task-desc-input"
          />
          <div className="new-task-actions">
            <button onClick={handleAddTask}>Add</button>
            <button onClick={() => setShowNewTask(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="add-task-btn" onClick={() => setShowNewTask(true)}>
          + Add Task
        </button>
      )}
    </div>
  );
}
