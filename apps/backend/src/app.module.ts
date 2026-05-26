// File: apps/backend/src/app.module.ts
// CHANGED: add GraphQLModule and SchedulesModule

import { Module }          from '@nestjs/common';
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

@Module({
  imports: [
    // ConfigModule — makes process.env available via ConfigService everywhere
    ConfigModule.forRoot({ isGlobal: true }),
    // EventEmitterModule — internal domain events (request.submitted, step.approved, etc.) // wildcard: true allows patterns like 'request.*' in listeners
    EventEmitterModule.forRoot({ wildcard: true }),

    // GraphQL — code-first, auto-generates schema from decorators.
    // playground available at /graphql in development.
    // context passes the raw Express request so GqlAuthGuard can read cookies.
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver:         ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema:     true,
      playground:     process.env.NODE_ENV !== 'production',
      context: ({ req }) => ({ req }),
    }),

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
})
export class AppModule {}