# Plan: Integración Pi Agent + Kanban

## Objetivo
Agregar un servicio `agent` al `docker-compose.yml` que use **Pi** (pi.dev) para ejecutar tareas automáticamente desde el Kanban board.

## Arquitectura

```
┌─────────────────────────────────────────────┐
│  Kanban Board (React)                        │
│  http://192.168.68.73:3000                   │
└──────────────┬──────────────────────────────┘
               │ crea tareas vía API
               ▼
┌─────────────────────────────────────────────┐
│  Kanban API (Express)                        │
│  http://192.168.68.73:3001                   │
│  GET/POST/PATCH tasks, columns, subtasks     │
└──────────────┬──────────────────────────────┘
               │ poll cada ~30s
               ▼
┌─────────────────────────────────────────────┐
│  Agent Worker (NUEVO - Node.js)              │
│  - Lee tareas en "To Do" sin assignee        │
│  - Las mueve a "In Progress"                 │
│  - Invoca a Pi con la descripción            │
│  - Actualiza subtasks                        │
│  - Mueve a "Done" al completar               │
│  - Reporta errores en la descripción         │
└──────────────┬──────────────────────────────┘
               │ ejecuta comandos
               ▼
┌─────────────────────────────────────────────┐
│  Pi Coding Agent                             │
│  - Modo non-interactive (-p flag)            │
│  - Limitado a dirs seguros                   │
│  - Timeout por tarea                         │
└─────────────────────────────────────────────┘
```

## Componentes nuevos

| Archivo | Descripción |
|---|---|
| `agent/Dockerfile` | Imagen con Node + Pi instalado |
| `agent/src/index.ts` | Worker loop: poll → execute → update |
| `agent/src/pi-runner.ts` | Wrapper para invocar Pi en modo headless |
| `agent/package.json` | Dependencias mínimas |

## Flujo del worker

1. **Poll**: Cada 30s, busca tareas en columna "To Do" o "Backlog" que no tengan assignee
2. **Claim**: Le asigna la tarea a `pi-agent` y la mueve a "In Progress"
3. **Execute**: Llama a `pi -p "<descripción de la tarea>"` con timeout configurable
4. **Result**: Si Pi termina ok → mueve a "Done". Si falla → agrega log de error en description y vuelve a "Backlog"
5. **Repeat**: Vuelve a poll

## Seguridad

- Pi corre en un directorio aislado dentro del container (`/workspace`)
- Sin acceso a la red externa (solo API del Kanban)
- Timeout máximo por tarea: 5 minutos
- Solo procesa tareas con tag `pi-agent` o asignadas explícitamente al agente
- Las tareas deben incluir instrucciones claras de qué hacer (archivos a modificar, comandos a correr)

## Docker Compose (nuevo servicio)

```yaml
agent:
  build:
    context: .
    dockerfile: agent/Dockerfile
  environment:
    KANBAN_API_URL: http://server:3001/api
    ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
  volumes:
    - agent-workspace:/workspace
  depends_on:
    server:
      condition: service_healthy
  restart: unless-stopped
```

## Pendiente por definir

1. **Modelo/API para Pi**: Necesita ANTHROPIC_API_KEY o provider configurado
2. **Tipo de tareas**: ¿Coding en un repo específico, comandos de sistema, o algo más acotado?
3. **Activación**: ¿Solo con tag `pi-agent` o cualquier tarea en To Do?
