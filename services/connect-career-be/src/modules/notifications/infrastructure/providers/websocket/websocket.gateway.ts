import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { Logger, UseGuards } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  import { ConfigService } from '@nestjs/config';
  
  @WebSocketGateway({
    cors: {
      origin: '*',
    },
    namespace: '/notifications',
  })
  export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    private readonly logger = new Logger(NotificationGateway.name);
    private readonly connectedUsers = new Map<string, string>(); // userId -> socketId
  
    constructor(
      private readonly jwtService: JwtService,
      private readonly configService: ConfigService,
    ) {}
  
    async handleConnection(client: Socket) {
      try {
        const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
        
        if (!token) {
          client.disconnect();
          return;
        }
  
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
  
        const userId = payload.sub;
        this.connectedUsers.set(userId, client.id);
        client.data.userId = userId;
  
        this.logger.log(`User ${userId} connected with socket ${client.id}`);
        
        // Join user-specific room
        client.join(`user:${userId}`);
      } catch (error) {
        this.logger.error('WebSocket authentication failed', error);
        client.disconnect();
      }
    }
  
    handleDisconnect(client: Socket) {
      const userId = client.data?.userId;
      if (userId) {
        this.connectedUsers.delete(userId);
        this.logger.log(`User ${userId} disconnected`);
      }
    }
  
    sendToUser(userId: string, event: string, data: any) {
      this.server.to(`user:${userId}`).emit(event, data);
    }
  
    sendNotification(userId: string, notification: any) {
      this.sendToUser(userId, 'notification', notification);
    }
  
    @SubscribeMessage('ping')
    handlePing(client: Socket) {
      return { event: 'pong', data: { timestamp: Date.now() } };
    }
  }