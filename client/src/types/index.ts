// Types for our Kanban data model

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: number;
  position: number;
  createdAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  position: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string | null;
  dueDate: string | null;
  tags: string; // JSON string
  // User Story fields
  storyType: 'user_story' | 'task' | 'bug';
  storyRole: string | null;
  storyGoal: string | null;
  storyBenefit: string | null;
  storyPoints: number | null;
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  position: number;
  color: string;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  title: string;
  description: string | null;
  columns: Column[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetail extends Task {
  comments: TaskComment[];
  column: Column | null;
  board: BoardListItem | null;
}

export interface BoardListItem {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
