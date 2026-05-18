// File: apps/api/src/modules/auth/decorators/index.ts
// Purpose: Barrel export — re-exports all decorators from their individual files.
//          Import from this index in controllers and guards:
//          import { Roles, CurrentUser } from '../decorators';

export { Roles, ROLES_KEY }  from './roles.decorator';
export { CurrentUser }       from './current-user.decorator';