# 🦞 Kanban Board

A full-stack Kanban board application with drag-and-drop, built for my homelab.

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript, @dnd-kit (drag-and-drop), React Router, react-hot-toast
- **Backend**: Express 5 + TypeScript, Drizzle ORM, Drizzle Kit (migrations)
- **Database**: PostgreSQL 16
- **Deployment**: Docker Compose, nginx (client), on LXC 101

## Features

### Boards
- Multiple boards with tab navigation
- Create, rename, and delete boards
- New boards auto-seeded with four columns: Backlog, To Do, In Progress, Done (Done green, In Progress amber, others indigo)

### Columns
- Add, rename, recolor, and delete columns
- Per-column color (color picker) and task counter
- Inline title editing (double-click)

### Tasks
- Drag-and-drop between columns and reordering within a column (@dnd-kit)
- Priority: `low` / `medium` / `high` / `urgent` with color indicators
- Assignee, due date, tags (JSON array)
- Task types: `task`, `user_story`, `bug`
- Inline editing on the board, plus a dedicated full-page task editor

### User stories
- "As a [role] / I want to [goal] / So that [benefit]" fields with a preview card
- Story points (Fibonacci: 1, 2, 3, 5, 8, 13, 21)

### Subtasks
- Add, toggle completion, delete
- Progress bar on the task detail page

### Comments
- Per-task comments with author and timestamp
- Edit and delete

### UX
- Dark theme
- Toast notifications, loading states, breadcrumb navigation

## Quick Start

```bash
docker compose up -d
```

| Service       | URL                              |
| ------------- | -------------------------------- |
| Frontend      | http://localhost:3000            |
| API           | http://localhost:3001/api        |
| Health check  | http://localhost:3001/health     |
| PostgreSQL    | localhost:5432 (db/user `kanban`)|

## API

All resource endpoints are mounted under `/api`. `/health` is mounted at the root.

### Boards

| Method | Path                | Description                                  |
| ------ | ------------------- | -------------------------------------------- |
| GET    | `/api/boards`       | List all boards                              |
| POST   | `/api/boards`       | Create a board (auto-seeds 4 default columns)|
| GET    | `/api/boards/:id`   | Get a board with columns, tasks, subtasks    |
| PATCH  | `/api/boards/:id`   | Update title/description                     |
| DELETE | `/api/boards/:id`   | Delete a board (cascades to columns/tasks)   |

### Columns

| Method | Path                              | Description                  |
| ------ | --------------------------------- | ---------------------------- |
| POST   | `/api/boards/:boardId/columns`    | Create a column              |
| PATCH  | `/api/columns/:id`                | Update title/color           |
| DELETE | `/api/columns/:id`                | Delete a column              |

### Tasks

| Method | Path                                | Description                                                                |
| ------ | ----------------------------------- | -------------------------------------------------------------------------- |
| GET    | `/api/tasks/:id`                    | Get a task with subtasks, comments, parent column, and board               |
| POST   | `/api/columns/:columnId/tasks`      | Create a task (title, description, priority, assignee, tags, story fields) |
| PATCH  | `/api/tasks/:id`                    | Update any task field (partial)                                            |
| PUT    | `/api/tasks/:id/move`               | Move task to column + position; optional `taskIds` to reorder column       |
| DELETE | `/api/tasks/:id`                    | Delete a task                                                              |

### Subtasks

| Method | Path                              | Description                  |
| ------ | --------------------------------- | ---------------------------- |
| POST   | `/api/tasks/:taskId/subtasks`     | Add a subtask                |
| PATCH  | `/api/subtasks/:id/toggle`        | Toggle completion (0 ↔ 1)    |
| DELETE | `/api/subtasks/:id`               | Delete a subtask             |

### Comments

| Method | Path                              | Description                  |
| ------ | --------------------------------- | ---------------------------- |
| GET    | `/api/tasks/:id/comments`         | List comments for a task     |
| POST   | `/api/tasks/:id/comments`         | Add a comment (author defaults to `Anonymous`) |
| PATCH  | `/api/comments/:id`               | Update content/author        |
| DELETE | `/api/comments/:id`               | Delete a comment             |

### Utility

| Method | Path       | Description                          |
| ------ | ---------- | ------------------------------------ |
| GET    | `/health`  | Liveness check (`{status, timestamp}`)|

## Data Model

PostgreSQL via Drizzle ORM. All foreign keys cascade on delete.

- **boards** — `id` (uuid), `title`, `description`, `created_at`, `updated_at`
- **columns** — `id`, `board_id` → boards, `title`, `position`, `color`, timestamps
- **tasks** — `id`, `column_id` → columns, `title`, `description`, `position`, `priority`, `assignee`, `due_date`, `tags` (JSON-string), user-story fields (`story_type`, `story_role`, `story_goal`, `story_benefit`, `story_points`), timestamps
- **subtasks** — `id`, `task_id` → tasks, `title`, `completed` (0/1), `position`, `created_at`
- **task_comments** — `id`, `task_id` → tasks, `author`, `content`, timestamps

Schema source: `server/src/db/schema.ts`. The server also runs idempotent `CREATE TABLE IF NOT EXISTS` statements on startup as a safety net.

## Configuration

Server environment variables:

| Variable       | Default                                              | Notes                          |
| -------------- | ---------------------------------------------------- | ------------------------------ |
| `DATABASE_URL` | `postgres://kanban:kanban123@postgres:5432/kanban`   | Set by `docker-compose.yml`    |
| `PORT`         | `3001`                                               | Express listen port            |

Postgres defaults (Compose): db `kanban`, user `kanban`, password `kanban123`, volume `pgdata`.

## Development

Server (`server/`):

```bash
npm run dev          # tsx watch
npm run build        # tsc
npm start            # node dist/index.js
npm run db:generate  # drizzle-kit generate
npm run db:migrate   # drizzle-kit migrate
npm run db:push      # drizzle-kit push
```

Client (`client/`):

```bash
npm run dev      # vite
npm run build    # tsc && vite build
npm run preview  # vite preview
```

## Project Structure

```
kanban/
├── server/                  # Express + Drizzle backend
│   └── src/
│       ├── db/              # schema.ts, connection
│       ├── routes/          # REST API endpoints (single index.ts router)
│       └── index.ts         # app entry, /api mount, /health, startup migrations
├── client/                  # React + Vite frontend
│   └── src/
│       ├── components/      # BoardView, Column, TaskCard, TaskDetailPage, …
│       ├── api/             # API client
│       └── types/           # TypeScript types
├── docker-compose.yml
├── Dockerfile.server
├── Dockerfile.client
└── nginx.conf
```

## Deployment

Deployed on homelab LXC 101 (`ubuntu-docker`) at `192.168.68.73`, managed via Proxmox.

### Syncing code changes from dev machine

After editing source files locally, sync to the LXC and rebuild the client. These commands are safe to run whether or not the containers are already running — `docker compose up -d` will stop and recreate only the affected container with the new image.

```bash
# Sync source files to the server (run from this machine)
rsync -av --exclude='node_modules' --exclude='.git' \
  /home/ariel/kanban/ ariel@192.168.68.73:/home/ariel/kanban/

# Rebuild and restart the client container (run on the server, or add --build to compose)
ssh ariel@192.168.68.73 "cd /home/ariel/kanban && docker compose build client && docker compose up -d client"
```

To rebuild just the API server:

```bash
ssh ariel@192.168.68.73 "cd /home/ariel/kanban && docker compose build server && docker compose up -d server"
```

To rebuild everything:

```bash
ssh ariel@192.168.68.73 "cd /home/ariel/kanban && docker compose up --build -d"
```
