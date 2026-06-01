// File: apps/backend/src/app.module.ts
// CHANGED: RolesGuard registered here so it runs AFTER BetterAuthModule's AuthGuard

import { Module }          from '@nestjs/common';
import { APP_GUARD }       from '@nestjs/core';
import { ConfigModule }    from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GraphQLModule }   from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join }            from 'path';

import { AuthModule }         from './modules/auth/auth.module';
import { RequestsModule }     from './modules/requests/requests.module';
import { ApprovalsModule }    from './modules/approvals/approvals.module';
import { VenuesModule }       from './modules/venues/venues.module';
import { AssetsModule }       from './modules/assets/assets.module';
import { AttachmentsModule }  from './modules/attachments/attachments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule }    from './modules/audit-logs/audit-logs.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { SchedulesModule }    from './modules/schedules/schedules.module';
import { RolesGuard }         from './modules/auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({ wildcard: true }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver:         ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema:     true,
      playground:     process.env.NODE_ENV !== 'production',
      context: ({ req }) => ({ req }),
    }),

    // CHANGED: AuthModule first — BetterAuthModule.forRoot() inside it
    // registers the AuthGuard as APP_GUARD
    AuthModule,
    RequestsModule,
    ApprovalsModule,
    AssetsModule,
    VenuesModule,
    AttachmentsModule,
    NotificationsModule,
    AuditLogsModule,
    SystemConfigModule,
    SchedulesModule,
  ],
  providers: [
    // CHANGED: RolesGuard registered LAST — after AuthModule has already
    // registered BetterAuthModule's AuthGuard, guaranteeing execution order:
    // 1. Better Auth AuthGuard → populates request.user
    // 2. RolesGuard → reads request.user and checks roles
    {
      provide:  APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}