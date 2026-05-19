import { Router } from 'express';
import { db } from '../db/index.js';
import { boards, columns, tasks, subtasks, taskComments } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';

const router = Router();

// Helpers
async function getBoardWithData(boardId: string) {
  const [board] = await db.select().from(boards).where(eq(boards.id, boardId));
  if (!board) return null;

  const boardColumns = await db.select().from(columns)
    .where(eq(columns.boardId, boardId))
    .orderBy(asc(columns.position));

  const columnsWithTasks = await Promise.all(boardColumns.map(async (col) => {
    const colTasks = await db.select().from(tasks)
      .where(eq(tasks.columnId, col.id))
      .orderBy(asc(tasks.position));

    const tasksWithSubtasks = await Promise.all(colTasks.map(async (task) => {
      const subs = await db.select().from(subtasks)
        .where(eq(subtasks.taskId, task.id))
        .orderBy(asc(subtasks.position));
      return { ...task, subtasks: subs };
    }));

    return { ...col, tasks: tasksWithSubtasks };
  }));

  return { ...board, columns: columnsWithTasks };
}

// Boards
router.get('/boards', async (_req, res) => {
  const result = await db.select().from(boards).orderBy(asc(boards.createdAt));
  res.json(result);
});

router.post('/boards', async (req, res) => {
  const { title, description } = req.body;
  const [board] = await db.insert(boards).values({ title, description }).returning();

  const defaults = ['Backlog', 'To Do', 'In Progress', 'Done'];
  for (let i = 0; i < defaults.length; i++) {
    await db.insert(columns).values({
      boardId: board.id,
      title: defaults[i],
      position: i,
      color: defaults[i] === 'Done' ? '#22c55e' :
             defaults[i] === 'In Progress' ? '#f59e0b' : '#6366f1',
    } as any);
  }

  const full = await getBoardWithData(board.id);
  res.status(201).json(full);
});

router.get('/boards/:id', async (req, res) => {
  const board = await getBoardWithData(String(req.params.id));
  if (!board) return res.status(404).json({ error: 'Board not found' });
  res.json(board);
});

router.patch('/boards/:id', async (req, res) => {
  const { title, description } = req.body;
  const [updated] = await db.update(boards)
    .set({ title, description, updatedAt: new Date() } as any)
    .where(eq(boards.id, String(req.params.id)))
    .returning();
  res.json(updated);
});

router.delete('/boards/:id', async (req, res) => {
  await db.delete(boards).where(eq(boards.id, String(req.params.id)));
  res.status(204).send();
});

// Columns
router.post('/boards/:boardId/columns', async (req, res) => {
  const { title, color } = req.body;
  const max = await db.select().from(columns)
    .where(eq(columns.boardId, String(req.params.boardId)))
    .orderBy(asc(columns.position));
  const position = max.length > 0 ? max[max.length - 1].position + 1 : 0;

  const [col] = await db.insert(columns).values({
    boardId: String(req.params.boardId), title, position,
    color: color || '#6366f1',
  } as any).returning();
  res.status(201).json(col);
});

router.patch('/columns/:id', async (req, res) => {
  const { title, color } = req.body;
  const [updated] = await db.update(columns)
    .set({ title, color, updatedAt: new Date() } as any)
    .where(eq(columns.id, String(req.params.id)))
    .returning();
  res.json(updated);
});

router.delete('/columns/:id', async (req, res) => {
  await db.delete(columns).where(eq(columns.id, String(req.params.id)));
  res.status(204).send();
});

// Tasks
router.get('/tasks/:id', async (req, res) => {
  const [task] = await db.select().from(tasks)
    .where(eq(tasks.id, String(req.params.id)));
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const subs = await db.select().from(subtasks)
    .where(eq(subtasks.taskId, task.id))
    .orderBy(asc(subtasks.position));

  const comments = await db.select().from(taskComments)
    .where(eq(taskComments.taskId, task.id))
    .orderBy(asc(taskComments.createdAt));

  // Get column and board info
  const [col] = await db.select().from(columns)
    .where(eq(columns.id, task.columnId));
  const board = col ? (await db.select().from(boards).where(eq(boards.id, col.boardId)))[0] : null;

  res.json({ ...task, subtasks: subs, comments, column: col || null, board: board || null });
});

router.post('/columns/:columnId/tasks', async (req, res) => {
  const { title, description, priority, assignee, tags, storyType, storyRole, storyGoal, storyBenefit, storyPoints } = req.body;
  const existing = await db.select().from(tasks)
    .where(eq(tasks.columnId, String(req.params.columnId)))
    .orderBy(asc(tasks.position));
  const position = existing.length > 0 ? existing[existing.length - 1].position + 1 : 0;

  const [task] = await db.insert(tasks).values({
    columnId: String(req.params.columnId), title, description, position,
    priority: priority || 'medium', assignee,
    tags: JSON.stringify(tags || []),
    storyType: storyType || 'task',
    storyRole: storyRole || null,
    storyGoal: storyGoal || null,
    storyBenefit: storyBenefit || null,
    storyPoints: storyPoints || null,
  } as any).returning();

  const subs = await db.select().from(subtasks)
    .where(eq(subtasks.taskId, task.id))
    .orderBy(asc(subtasks.position));
  res.status(201).json({ ...task, subtasks: subs });
});

router.patch('/tasks/:id', async (req, res) => {
  const { title, description, priority, assignee, tags, dueDate, columnId, position,
    storyType, storyRole, storyGoal, storyBenefit, storyPoints } = req.body;
  const update: any = { updatedAt: new Date() };
  if (title !== undefined) update.title = title;
  if (description !== undefined) update.description = description;
  if (priority !== undefined) update.priority = priority;
  if (assignee !== undefined) update.assignee = assignee;
  if (tags !== undefined) update.tags = JSON.stringify(tags);
  if (dueDate !== undefined) update.dueDate = dueDate ? new Date(dueDate) : null;
  if (columnId !== undefined) update.columnId = columnId;
  if (position !== undefined) update.position = position;
  if (storyType !== undefined) update.storyType = storyType;
  if (storyRole !== undefined) update.storyRole = storyRole;
  if (storyGoal !== undefined) update.storyGoal = storyGoal;
  if (storyBenefit !== undefined) update.storyBenefit = storyBenefit;
  if (storyPoints !== undefined) update.storyPoints = storyPoints;

  const [updated] = await db.update(tasks)
    .set(update)
    .where(eq(tasks.id, String(req.params.id)))
    .returning();

  const subs = await db.select().from(subtasks)
    .where(eq(subtasks.taskId, updated.id))
    .orderBy(asc(subtasks.position));
  res.json({ ...updated, subtasks: subs });
});

router.put('/tasks/:id/move', async (req, res) => {
  const { columnId, position, taskIds } = req.body;

  await db.update(tasks)
    .set({ columnId, position, updatedAt: new Date() } as any)
    .where(eq(tasks.id, String(req.params.id)));

  if (taskIds) {
    for (let i = 0; i < taskIds.length; i++) {
      await db.update(tasks)
        .set({ position: i } as any)
        .where(eq(tasks.id, taskIds[i]));
    }
  }

  const subs = await db.select().from(subtasks)
    .where(eq(subtasks.taskId, String(req.params.id)))
    .orderBy(asc(subtasks.position));

  const [task] = await db.select().from(tasks)
    .where(eq(tasks.id, String(req.params.id)));
  res.json({ ...task, subtasks: subs });
});

router.delete('/tasks/:id', async (req, res) => {
  await db.delete(tasks).where(eq(tasks.id, String(req.params.id)));
  res.status(204).send();
});

// Subtasks
router.post('/tasks/:taskId/subtasks', async (req, res) => {
  const { title } = req.body;
  const existing = await db.select().from(subtasks)
    .where(eq(subtasks.taskId, String(req.params.taskId)))
    .orderBy(asc(subtasks.position));
  const position = existing.length > 0 ? existing[existing.length - 1].position + 1 : 0;

  const [sub] = await db.insert(subtasks).values({
    taskId: String(req.params.taskId), title, position,
  } as any).returning();
  res.status(201).json(sub);
});

router.patch('/subtasks/:id/toggle', async (req, res) => {
  const [sub] = await db.select().from(subtasks)
    .where(eq(subtasks.id, String(req.params.id)));
  if (!sub) return res.status(404).json({ error: 'Not found' });

  const [updated] = await db.update(subtasks)
    .set({ completed: sub.completed ? 0 : 1 })
    .where(eq(subtasks.id, String(req.params.id)))
    .returning();
  res.json(updated);
});

router.delete('/subtasks/:id', async (req, res) => {
  await db.delete(subtasks).where(eq(subtasks.id, String(req.params.id)));
  res.status(204).send();
});

// Task Comments
router.get('/tasks/:id/comments', async (req, res) => {
  const comments = await db.select().from(taskComments)
    .where(eq(taskComments.taskId, String(req.params.id)))
    .orderBy(asc(taskComments.createdAt));
  res.json(comments);
});

router.post('/tasks/:id/comments', async (req, res) => {
  const { author, content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Content is required' });
  }
  const [comment] = await db.insert(taskComments).values({
    taskId: String(req.params.id),
    author: author || 'Anonymous',
    content: content.trim(),
  }).returning();
  res.status(201).json(comment);
});

router.patch('/comments/:id', async (req, res) => {
  const { content, author } = req.body;
  const update: any = { updatedAt: new Date() };
  if (content !== undefined) update.content = content;
  if (author !== undefined) update.author = author;

  const [updated] = await db.update(taskComments)
    .set(update)
    .where(eq(taskComments.id, String(req.params.id)))
    .returning();
  if (!updated) return res.status(404).json({ error: 'Comment not found' });
  res.json(updated);
});

router.delete('/comments/:id', async (req, res) => {
  await db.delete(taskComments).where(eq(taskComments.id, String(req.params.id)));
  res.status(204).send();
});

export default router;
