# 🦞 Kanban Board

A full-stack Kanban board application with drag-and-drop, built for my homelab.

## Tech Stack

- **Frontend**: React + Vite + TypeScript + @dnd-kit
- **Backend**: Express + TypeScript + Drizzle ORM
- **Database**: PostgreSQL 16
- **Deployment**: Docker Compose on LXC 101

## Features

- Multiple boards with tab navigation
- Drag-and-drop tasks between columns
- Tasks with priority, tags, assignee, and due dates
- Subtasks with completion toggles
- Dark theme UI
- REST API for full CRUD operations

## Quick Start

```bash
docker compose up -d
```

The app will be available at:

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Health check**: http://localhost:3001/health

New boards are auto-created with 4 default columns: Backlog, To Do, In Progress, Done.

## API

See [the kanban skill](../skills/kanban/references/api.md) for complete API documentation.

## Project Structure

```
kanban/
├── server/           # Express + Drizzle backend
│   └── src/
│       ├── db/       # Database schema and connection
│       └── routes/   # REST API endpoints
├── client/           # React + Vite frontend
│   └── src/
│       ├── components/  # React components
│       ├── api/         # API client
│       └── types/       # TypeScript types
├── docker-compose.yml
├── Dockerfile.server
├── Dockerfile.client
└── nginx.conf
```

## Deployment

Deployed on homelab LXC 101 (`ubuntu-docker`) at `192.168.68.73`, managed via Proxmox.
