// File: apps/backend/src/modules/notifications/gateway/notifications.gateway.ts
// Purpose: Socket.IO WebSocket gateway. Passive delivery only — never initiates events.
//          Authenticates via Better Auth cookie on handshake (Option A).
//          Each authenticated user joins a room named user:{userId}.
//          sendToUser() is called by NotificationsService after DB write.
// Dependencies: @nestjs/websockets, @nestjs/platform-socket.io, socket.io, better-auth

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { auth } from '../../../auth';

// cors origin mirrors main.ts — credentials: true is required for cookie auth
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin:      process.env.FRONTEND_URL ?? 'http://localhost:6000',
    credentials: true, // required — browser must send the Better Auth session cookie
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  // Called automatically by Socket.IO when a client connects.
  // Validates the Better Auth session from the cookie in the handshake headers.
  // Rejects the connection immediately if the session is invalid.
  async handleConnection(client: Socket) {
    try {
      // Better Auth reads the session cookie from the raw HTTP headers
      // that Socket.IO passes through during the WebSocket handshake.
      // We reconstruct a minimal Request-like object that auth.api.getSession() accepts.
      const headers  = client.handshake.headers;
      const request  = new Request('http://internal/session', { headers: headers as any });
      const session  = await auth.api.getSession({ headers: request.headers });

      if (!session?.user?.id) {
        this.logger.warn(`[Gateway] rejected unauthenticated connection: ${client.id}`);
        client.disconnect(true);
        return;
      }

      // Store userId on the socket for use in handleDisconnect
      (client as any).userId = session.user.id;

      // Join a private room for this user — sendToUser targets this room
      const room = `user:${session.user.id}`;
      await client.join(room);

      this.logger.log(`[Gateway] ${client.id} connected → room ${room}`);
    } catch (err: any) {
      this.logger.error(`[Gateway] connection error: ${err.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId ?? 'unknown';
    this.logger.log(`[Gateway] ${client.id} disconnected (userId: ${userId})`);
  }

  // Called by NotificationsService after creating a DB row.
  // Emits notification.new to the target user's room only.
  sendToUser(userId: string, event: string, payload: unknown) {
    const room = `user:${userId}`;
    this.server.to(room).emit(event, payload);
    this.logger.log(`[Gateway] emitted "${event}" → ${room}`);
  }
}