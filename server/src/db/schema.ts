import { pgTable, uuid, varchar, text, timestamp, integer, serial } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Boards
export const boards = pgTable('boards', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const boardsRelations = relations(boards, ({ many }) => ({
  columns: many(columns),
}));

// Columns (lists within a board)
export const columns = pgTable('columns', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  position: integer('position').notNull(),
  color: varchar('color', { length: 20 }).default('#6366f1'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const columnsRelations = relations(columns, ({ one, many }) => ({
  board: one(boards, { fields: [columns.boardId], references: [boards.id] }),
  tasks: many(tasks),
}));

// Tasks (cards)
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  columnId: uuid('column_id').references(() => columns.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  position: integer('position').notNull(),
  priority: varchar('priority', { length: 20 }).default('medium'), // low, medium, high, urgent
  assignee: varchar('assignee', { length: 255 }),
  dueDate: timestamp('due_date'),
  tags: text('tags').default('[]'), // JSON array as string
  // User Story fields
  storyType: varchar('story_type', { length: 20 }).default('task'), // 'user_story' | 'task' | 'bug'
  storyRole: text('story_role'),     // "As a [user]"
  storyGoal: text('story_goal'),     // "I want to [action]"
  storyBenefit: text('story_benefit'), // "So that [value]"
  storyPoints: integer('story_points'), // Fibonacci: 1,2,3,5,8,13...
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tasksRelations = relations(tasks, ({ one }) => ({
  column: one(columns, { fields: [tasks.columnId], references: [columns.id] }),
}));

// Subtasks
export const subtasks = pgTable('subtasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  completed: integer('completed').default(0), // 0 or 1
  position: integer('position').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subtasksRelations = relations(subtasks, ({ one }) => ({
  task: one(tasks, { fields: [subtasks.taskId], references: [tasks.id] }),
}));

// Task Comments
export const taskComments = pgTable('task_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  author: varchar('author', { length: 255 }).default('Anonymous').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, { fields: [taskComments.taskId], references: [tasks.id] }),
}));
