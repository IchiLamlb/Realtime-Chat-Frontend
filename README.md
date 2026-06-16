# Realtime Chat Frontend

React client for the Spring Boot realtime chat backend.

## GitHub Mapping

- Frontend: https://github.com/IchiLamlb/Realtime-Chat-Frontend
- Backend: https://github.com/IchiLamlb/Realtime-Chat

## Stack

- React 18
- TypeScript
- Vite
- STOMP WebSocket via `@stomp/stompjs`

## Run Local

Start backend and infrastructure first from the repository root:

```powershell
docker compose up -d
.\mvnw.cmd -pl backend spring-boot:run
```

Then start frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Backend Contract

The Vite dev server proxies these paths to `localhost:8080`:

- `/api`
- `/actuator`
- `/ws`

Implemented screens:

- Register/login with JWT access token and refresh token retry
- User search
- Direct conversation creation
- Group conversation creation from current search results
- Conversation list
- Message history
- Send text message
- STOMP subscription to `/topic/conversations/{conversationId}`
- Typing event send/receive

## Known Backend Dependency

WebSocket JWT authentication is handled by the backend STOMP `CONNECT` flow. If STOMP send fails, REST message send still works as fallback.
