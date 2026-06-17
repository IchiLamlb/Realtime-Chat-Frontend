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
- User search by username, email, or display name
- Direct conversation creation
- Group conversation creation through a modal with group name, searchable member picker, 10 visible users at a time, scroll/load-more, and selected-member count
- Conversation list
- Message history
- Send text message
- Send file, image, and voice attachment messages
- Hover message action bar with reply, emoji, and more menu controls
- Reply preview stored in outgoing message `metadata.replyTo`
- Emoji reactions through REST/WebSocket
- Delete-for-me on the client and delete-for-everyone through `DELETE /api/v1/messages/{id}`
- STOMP subscription to `/topic/conversations/{conversationId}`
- Typing event send/receive

## Known Backend Dependency

WebSocket JWT authentication is handled by the backend STOMP `CONNECT` flow. If STOMP send fails, REST message send still works as fallback.
