import { useState } from 'react';
import { Board, Column as ColumnType } from '../types';
import { createColumn } from '../api';
import { Column } from './Column';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import toast from 'react-hot-toast';
import { moveTask } from '../api';

interface Props {
  board: Board;
  onUpdate: () => void;
}

export function BoardView({ board, onUpdate }: Props) {
  const [showNewColumn, setShowNewColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const [newColColor, setNewColColor] = useState('#6366f1');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleCreateColumn = async () => {
    if (!newColTitle.trim()) return;
    try {
      await createColumn(board.id, { title: newColTitle.trim(), color: newColColor });
      setNewColTitle('');
      setShowNewColumn(false);
      onUpdate();
      toast.success('Column added');
    } catch (e) {
      toast.error('Failed to add column');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Find which column the task is being dropped onto
    let targetColumn: ColumnType | undefined;
    let targetPosition: number | undefined;

    // Check if dropping on a column directly
    targetColumn = board.columns.find((c) => c.id === overId);
    if (targetColumn) {
      // Dropped on column directly — append to end
      targetPosition = targetColumn.tasks.length;
    } else {
      // Check if dropping on another task
      for (const col of board.columns) {
        const taskIndex = col.tasks.findIndex((t) => t.id === overId);
        if (taskIndex !== -1) {
          targetColumn = col;
          targetPosition = taskIndex;
          break;
        }
      }
    }

    if (!targetColumn || targetPosition === undefined) return;

    // If dropping into same column at same position, no-op
    const sourceTask = board.columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    if (!sourceTask) return;

    if (sourceTask.columnId === targetColumn.id) {
      const currentPos = targetColumn.tasks.findIndex((t) => t.id === taskId);
      if (currentPos === targetPosition) return;
    }

    // Build new order for target column:
    // Get current tasks in target column, sorted by position
    const orderedTasks = targetColumn.tasks
      .filter((t) => t.id !== taskId)
      .sort((a, b) => a.position - b.position);

    // Insert the moved task at the target position
    const newTaskIds = orderedTasks.map((t) => t.id);
    newTaskIds.splice(targetPosition, 0, taskId);

    try {
      await moveTask(taskId, {
        columnId: targetColumn.id,
        position: targetPosition,
        taskIds: newTaskIds,
      });
      onUpdate();
    } catch (e) {
      toast.error('Failed to move task');
    }
  };

  const activeTask = activeId
    ? board.columns.flatMap((c) => c.tasks).find((t) => t.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="board">
        <SortableContext
          items={board.columns.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          {board.columns.map((col) => (
            <Column key={col.id} column={col} onUpdate={onUpdate} allColumns={board.columns} />
          ))}
        </SortableContext>

        {showNewColumn ? (
          <div className="new-column-form">
            <input
              autoFocus
              value={newColTitle}
              onChange={(e) => setNewColTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateColumn(); if (e.key === 'Escape') setShowNewColumn(false); }}
              placeholder="Column name..."
            />
            <input
              type="color"
              value={newColColor}
              onChange={(e) => setNewColColor(e.target.value)}
            />
            <div className="new-col-actions">
              <button onClick={handleCreateColumn}>Add</button>
              <button onClick={() => setShowNewColumn(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="add-column-btn" onClick={() => setShowNewColumn(true)}>
            + Add Column
          </button>
        )}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="task-card dragging">
            <h4>{activeTask.title}</h4>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
