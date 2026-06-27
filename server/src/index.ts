import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  // Run migrations on startup
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS boards (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS columns (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
        title VARCHAR(255) NOT NULL,
        position INTEGER NOT NULL,
        color VARCHAR(20) DEFAULT '#6366f1',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        column_id UUID REFERENCES columns(id) ON DELETE CASCADE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        position INTEGER NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium',
        assignee VARCHAR(255),
        due_date TIMESTAMP,
        tags TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS subtasks (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
        title VARCHAR(500) NOT NULL,
        completed INTEGER DEFAULT 0,
        position INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS task_comments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
        author VARCHAR(255) DEFAULT 'Anonymous' NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      
      -- Migration: add updated_at if it doesn't exist (pre-v0.3 boards)
      DO $$ BEGIN
        ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;

      -- Migration: add user-story fields to tasks (pre-story boards)
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS story_type VARCHAR(20) DEFAULT 'task';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS story_role TEXT;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS story_goal TEXT;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS story_benefit TEXT;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS story_points INTEGER;
    `);
    console.log('✅ Database tables ready');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🦞 Kanban API running on port ${PORT}`);
  });
}

start();
