// File: apps/api/src/app.module.ts
// Purpose: Root application module.
//          Imports AuthModule which internally sets up Better Auth,
//          the global AuthGuard, and the global RolesGuard.
// Dependencies: @nestjs/common, @nestjs/config, @nestjs/event-emitter

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AuthModule } from './modules/auth/auth.module';

// Uncomment as each module is built:
// import { RequestsModule }      from './modules/requests/requests.module';
// import { ApprovalsModule }     from './modules/approvals/approvals.module';
// import { VenuesModule }        from './modules/venues/venues.module';
// import { AssetsModule }        from './modules/assets/assets.module';
// import { NotificationsModule } from './modules/notifications/notifications.module';
// import { AuditLogsModule }     from './modules/audit-logs/audit-logs.module';

@Module({
  imports: [
    // ConfigModule — makes process.env available via ConfigService everywhere
    ConfigModule.forRoot({ isGlobal: true }),

    // EventEmitterModule — internal domain events (request.submitted, step.approved, etc.)
    // wildcard: true allows patterns like 'request.*' in listeners
    EventEmitterModule.forRoot({ wildcard: true }),

    // AuthModule sets up Better Auth + global AuthGuard + global RolesGuard
    AuthModule,
  ],
})
export class AppModule {}
