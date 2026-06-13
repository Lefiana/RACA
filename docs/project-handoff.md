RACA Platform — Complete Project Handoff Document

Current System ArchitectureMonorepo StructureRacant/├── apps/│   ├── backend/          # NestJS API (port 60001)│   └── frontend/         # Next.js 16 App Router (port 60000)├── packages/│   ├── database/         # Prisma schema, migrations, seed│   └── ui/               # Shared shadcn component library├── pnpm-workspace.yaml└── turbo.jsonTech Stack

Backend: NestJS 11, Prisma 5, PostgreSQL, Better Auth 1.6.11, Socket.IO, GraphQL (schedules only)Frontend: Next.js 16 (Turbopack), React 19, TanStack Query 5, Axios, Tailwind CSS v3, shadcn/ui (nova style, mist base, pink theme)DevOps: Turborepo, pnpm, local PostgreSQL via pgAdminAuth: Better Auth with cookie-based sessions, dedicated PrismaClient instance in auth.ts

Critical Architecture DecisionThe packages/database/index.ts exports prisma as a singleton but this fails at runtime in NestJS because the compiled JS cannot resolve the .ts entry point. The fix was creating a PrismaService (NestJS injectable) in apps/backend/src/prisma.service.ts that all repositories inject instead of importing prisma directly.

Database StructureKey Models (from packages/database/prisma/schema.prisma)User          — Better Auth user with role, department, isActiveSession       — Better Auth sessionsAccount       — Better Auth credentials (providerId: 'credential')Request       — RACA activity request (6 sections)ApprovalStep  — 7-step approval chain per requestVenueBooking  — Links request to venue with buffer timesAssetCheckout — Links request to assetVenue         — Physical spacesAsset         — Equipment inventoryNotification  — In-app notificationsAuditLog      — Append-only event logSystemConfig  — Key-value institutional settingsMaintenanceLog— Venue/asset maintenance recordsAttachment    — File uploads linked to request or stepUser Roles (enum UserRole)REQUESTOR        — Creates and submits requestsADVISER          — Stage 1 approver (multiple per institution)DEPARTMENT_HEAD  — Stage 1 approver (per department)ACADEMIC_HEAD    — Stage 2 parallel approverSTUDENT_AFFAIRS  — Stage 2 parallel approverMIS              — Stage 2 parallel approver + asset custodianBUILDING_ADMIN   — Stage 2 parallel approver + venue/asset custodianHRM_CUSTODIAN    — Asset custodian only (no approval role)SCHOOL_ADMIN     — Stage 3 final approver + admin visibilitySUPER_ADMIN      — Full system accessApproval Stages (enum ApprovalStage)STAGE_1_ADVISERSTAGE_1_DEPT_HEADSTAGE_2_ACADEMIC_HEADSTAGE_2_HEAD_OF_STUDENT_AFFAIRSSTAGE_2_MISSTAGE_2_BUILDINGSTAGE_3_SCHOOL_ADMINRequest Status FlowDRAFT → PENDING → STAGE1_REVIEW → STAGE2_REVIEW → PENDING_FINAL → APPROVED→ REJECTED→ CANCELLED

Approval Workflow DesignCurrent Order (UPDATED — not yet fully implemented in backend)StepStageRoleType1STAGE_1_ADVISERADVISERSelected by requestor2STAGE_1_DEPT_HEADDEPARTMENT_HEADAuto-resolved (per dept)3STAGE_2_ACADEMIC_HEADACADEMIC_HEADAuto-resolved4STAGE_2_HEAD_OF_STUDENT_AFFAIRSSTUDENT_AFFAIRSAuto-resolved5STAGE_2_MISMISAuto-resolved6STAGE_2_BUILDINGBUILDING_ADMINAuto-resolved7STAGE_3_SCHOOL_ADMINSCHOOL_ADMINAuto-resolvedStage Transitions

Adviser approves → PENDING → STAGE1_REVIEWDept Head approves → STAGE1_REVIEW → STAGE2_REVIEW + venues lockedAll 4 Stage 2 approve → STAGE2_REVIEW → PENDING_FINALSchool Admin approves → PENDING_FINAL → APPROVED + venues confirmedAny rejection → REJECTED + remaining steps SKIPPED + venues unlocked

Stage 2 Parallel ApprovalAll 4 Stage 2 approvers act independently. countStage2Approved() in ApprovalsRepository counts approved steps. When count reaches 4, advances to PENDING_FINAL.

Implemented Features4.1 Authentication ✅Files:

apps/backend/src/auth.ts — Better Auth instance with dedicated PrismaClient (not shared singleton)apps/frontend/app/lib/auth/api.ts — sign-in, sign-up, sign-out, get-sessionapps/frontend/app/lib/auth/hooks.ts — useSession, useSignIn, useSignUp, useSignOut, useCurrentUserapps/frontend/app/(auth)/login/page.tsxapps/frontend/app/(auth)/register/page.tsxapps/frontend/app/(auth)/layout.tsx

Known issue fixed: disableCSRFCheck: true added to auth.ts advanced config. Login race condition fixed with retryDelay: 500 in useSession and refetchQueries in useSignIn.Password hashing: Better Auth uses scrypt internally. Seed no longer creates account rows — admin is created via sign-up endpoint then role assigned manually or via the Users page.4.2 Request Lifecycle ✅Backend files:

apps/backend/src/modules/requests/repositories/requests.repository.ts — all DB queries via injected PrismaServiceapps/backend/src/modules/requests/services/requests.service.ts — business logic, injects PrismaServiceapps/backend/src/modules/requests/controllers/requests.controller.tsapps/backend/src/modules/requests/requests.module.ts — includes PrismaService in providers

Frontend files:

apps/frontend/app/lib/requests/types.ts — includes approverId on IRequestApprovalStepapps/frontend/app/lib/requests/api.tsapps/frontend/app/lib/requests/hooks.tsapps/frontend/app/(dashboard)/requests/page.tsx — list with view toggle (My Requests / For My Review)apps/frontend/app/(dashboard)/requests/new/page.tsx — 6-section RACA formapps/frontend/app/(dashboard)/requests/[id]/page.tsx — detail with approval chain display

Status transitions implemented: DRAFT→PENDING (submit), DRAFT/PENDING→CANCELLED4.3 Approval Chain ✅ (partial)Backend files:

apps/backend/src/modules/approvals/repositories/approvals.repository.ts — injects PrismaServiceapps/backend/src/modules/approvals/services/approvals.service.tsapps/backend/src/modules/approvals/controllers/approvals.controller.ts — includes GET /

Frontend files:

apps/frontend/app/lib/approvals/types.tsapps/frontend/app/lib/approvals/api.ts — includes getStepByIdapps/frontend/app/lib/approvals/hooks.ts — includes useApprovalStep with 15s pollingapps/frontend/app/(dashboard)/approvals/page.tsx — pending queue, links to /approvals/[stepId]apps/frontend/app/(dashboard)/approvals/[stepId]/page.tsx — dedicated approver view with approve/reject formsapps/frontend/app/(dashboard)/approvals/decide-modal.tsx — modal (used on request detail for owner's step)

Tested: Full approval workflow tested across all 7 approver accounts successfully.4.4 User Management ✅Backend files:

apps/backend/src/modules/auth/users/users.repository.ts — injects PrismaServiceapps/backend/src/modules/auth/users/users.service.tsapps/backend/src/modules/auth/users/users.controller.tsapps/backend/src/modules/auth/users/users.module.ts

Frontend files:

apps/frontend/app/lib/users/types.tsapps/frontend/app/lib/users/api.ts — includes createUser (sign-up + role assign with withCredentials: false to prevent session override)apps/frontend/app/lib/users/hooks.ts — includes useCreateUserapps/frontend/app/(dashboard)/users/page.tsx — list + Create User modalapps/frontend/app/(dashboard)/users/[id]/page.tsx — role assignment, toggle active, delete

Known fix: createUser uses withCredentials: false on the auth client to prevent the new user's session from overwriting the super admin's session during creation.4.5 PrismaService ✅File: apps/backend/src/prisma.service.tsts@Injectable()export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {async onModuleInit() { await this.$connect(); }async onModuleDestroy() { await this.$disconnect(); }}All modules updated to include PrismaService in providers:

RequestsModule, ApprovalsModule, VenuesModule, AssetsModuleAttachmentsModule, NotificationsModule, AuditLogsModuleSystemConfigModule, SchedulesModule, UsersModule

All repositories updated to inject PrismaService via constructor instead of importing prisma from @repo/database.All services/listeners that called prisma directly updated:

requests.service.ts, attachments.service.tsaudit-logs.listener.ts, notifications.listener.tsschedules.service.ts

4.6 Venues Module ✅

Repository, service, controller, module all updated to use PrismaServiceCRUD, availability check, maintenance log creation

4.7 Assets Module ✅

Repository, service, controller, module all updated to use PrismaServiceCSV import, checkout/return processing, custodian-scoped access

4.8 Notifications Module ✅

Repository, service, listener, gateway, module updatedWebSocket gateway at /notifications namespaceEvent-driven creation via @nestjs/event-emitter

4.9 Audit Logs Module ✅

Repository, service, listener, controller, module updatedAppend-only, never deletedLogs all major domain events

4.10 System Config Module ✅

Repository, service, controller, module updatedProtected keys: reservation_buffer_min, reference_number_prefix, allowed_mime_types, max_upload_size_mb

4.11 Attachments Module ✅

Repository, service, controller, module updatedFile upload to request or approval stepStorageService for disk operations

4.12 Schedules Module ✅ (GraphQL)

Service updated to use injected PrismaServiceGraphQL queries: venueSchedule, assetSchedule, maintenanceSchedule, calendarSummary

4.13 Frontend Layout ✅

apps/frontend/app/layout.tsx — EB Garamond font, QueryProviderapps/frontend/app/(dashboard)/layout.tsx — session guard with 500ms redirect delayapps/frontend/components/layout/sidebar.tsx — role-aware navigationapps/frontend/components/layout/navbar.tsx — sign outapps/frontend/app/page.tsx — redirects to /dashboard

4.14 Shared UI Package ✅

packages/ui/src/components/ui/button.tsx — shadcn buttonpackages/ui/src/lib/utils.ts — cn() helperpackages/ui/components.json — nova style, mist base, tabler iconspackages/ui/tailwind.config.cjs — shared Tailwind configpackages/ui/src/styles/globals.css — CSS variables (HSL format for Tailwind v3)packages/ui/tsconfig.json — @/* alias pointing to ./src/*

Adviser Assignment — Current vs RequiredCurrent Implementation (BROKEN for multi-adviser)ts// requests.service.ts — resolveApprovers()const user = await this.prisma.user.findFirst({where: { role: UserRole.ADVISER, isActive: true, deletedAt: null },});result[ApprovalStage.STAGE_1_ADVISER] = user?.id ?? null;Problem: Always picks the first ADVISER in the database. With multiple teachers having ADVISER role, this is wrong.Option B — Selected (requestor picks adviser)Required backend changes NOT YET IMPLEMENTED:

New DTO:

ts// apps/backend/src/modules/requests/dto/submit-request.dto.tsexport class SubmitRequestDto {@IsString() @IsNotEmpty()adviserId: string;}

Controller update — submit accepts body:

ts@Post('/submit')async submit(@Session() session, @Param('id') id, @Body() dto: SubmitRequestDto) {return this.requestsService.submit(id, session.user.id, session.user.role, dto.adviserId);}

Service update — validate adviser exists, pass to resolveApprovers:

tsasync submit(requestId, userId, userRole, adviserId: string) {// validate adviserconst adviser = await this.prisma.user.findFirst({where: { id: adviserId, role: UserRole.ADVISER, isActive: true, deletedAt: null }});if (!adviser) throw new BadRequestException('Selected adviser not found');const approverMap = await this.resolveApprovers(adviserId);// ...}

private async resolveApprovers(adviserId: string) {result[ApprovalStage.STAGE_1_ADVISER] = adviserId; // explicit// auto-resolve the rest}

New step order in submitRequest:

tsconst steps = [{ stage: STAGE_1_ADVISER,                 stepOrder: 1, title: 'Adviser' },{ stage: STAGE_1_DEPT_HEAD,               stepOrder: 2, title: 'Department Head' },{ stage: STAGE_2_ACADEMIC_HEAD,           stepOrder: 3, title: 'Academic Head' },{ stage: STAGE_2_HEAD_OF_STUDENT_AFFAIRS, stepOrder: 4, title: 'Head of Student Affairs' },{ stage: STAGE_2_MIS,                     stepOrder: 5, title: 'MIS' },{ stage: STAGE_2_BUILDING,               stepOrder: 6, title: 'Building Administrator' },{ stage: STAGE_3_SCHOOL_ADMIN,           stepOrder: 7, title: 'School Administrator' },];

Frontend — adviser picker in new request form:

tsx// Fetch advisersconst { data: advisersData } = useUsers({ role: 'ADVISER', limit: 100 });// Add select dropdown before Section I// Pass adviserId in submit call

Frontend — update submitRequest API call to send body:

ts// apps/frontend/app/lib/requests/api.tsexport async function submitRequest(id: string, adviserId: string): Promise {const res = await apiClient.post(/requests/${id}/submit, { adviserId });return res.data;}

Department Head RoutingCurrent ImplementationAuto-resolves to first user with DEPARTMENT_HEAD role. Problem: multiple departments may have different Department Heads.Required Solution (NOT YET IMPLEMENTED)Department Heads should be assigned per department. When a request is submitted:

Match the requestor's department field to the Department Head with the same departmentFallback to any active DEPARTMENT_HEAD if no match

ts// In resolveApprovers:const deptHead = await this.prisma.user.findFirst({where: {role: UserRole.DEPARTMENT_HEAD,department: requestorDepartment, // match departmentisActive: true,deletedAt: null,},}) ?? await this.prisma.user.findFirst({where: { role: UserRole.DEPARTMENT_HEAD, isActive: true, deletedAt: null }});Requires: Passing requestorDepartment to resolveApprovers. Need to fetch requestor's department in the submit flow.

Dashboard and Visibility ImprovementsApprover Dashboard — NOT YET IMPLEMENTEDRequired page: /approvals/history or filter tabs on /approvalsNeeds:

Tab: Pending (current /approvals page)Tab: Approved (steps where status = APPROVED and approverId = userId)Tab: Rejected (steps where status = REJECTED and approverId = userId)Tab: All (all steps for this user)

Backend query needed in ApprovalsRepository:tsasync findAllForUser(params: { userId, userRole, status?, skip, take }) {// Remove the requestStatus filter — show all regardless of current stageconst where = {OR: [{ approverId: userId },...(assignedStage ? [{ approverId: null, stage: assignedStage }] : [])],...(status && { status })};}Approval Chain Visibility — PARTIALLY IMPLEMENTED

Currently: approver can view /approvals/[stepId] which calls GET /approvals/findStepById in service checks if user is assigned to the stepGap: Approvers can see their own step but cannot browse all requests in the system to see upcoming workFix needed: findOne in requests.service.ts needs to allow approvers assigned to any step on the request to view it (partially added but 403 still occurring — see Section 16)

Approval Progress TrackingCurrently Implemented

Approval chain displayed on request detail page (/requests/[id])Each step shows: title, status badge, approver name, decided date, remarks, rejection reasonColor coding: yellow=PENDING, green=APPROVED, red=REJECTED, gray=SKIPPEDDot progress indicator added to requests list (7 dots, colored by status)

Planned but Not Implemented

Progress bar component showing current stage visually"Currently at Step X of 7" labelTimeline view showing who approved when

Real-Time UpdatesCurrent State

Polling implemented: usePendingApprovals refetches every 30s, useApprovalStep every 15sAfter approve/reject, onSuccess invalidates relevant query keys causing immediate refetch

Gap

WebSocket gateway exists (/notifications namespace) but not connected to approval state changes on the frontendAfter an approver acts, the next approver's pending queue updates within 15-30s via pollingNo instant push notification to next approver

Required for Real-Timets// Frontend: connect to WebSocket in notifications hooks// Listen for 'notification.new' events// On STAGE_ADVANCED notification, invalidate approvals queries

Self-Approval RestrictionCurrent BehaviorThe approval chain assigns approverId to the user with the matching role. If a DEPT_HEAD submits a request, they could theoretically be assigned as the DEPT_HEAD approver for step 2.Backend Fix RequiredIn resolveApprovers, skip the requestor when finding approvers:ts// In requests.service.ts — resolveApprovers// Pass requestedById and exclude from auto-resolveconst user = await this.prisma.user.findFirst({where: {role,isActive:  true,deletedAt: null,id: { not: requestedById }, // EXCLUDE the requestor},});Frontend Fix RequiredIn approvals/[stepId]/page.tsx, the approve/reject buttons are shown when step.status === 'PENDING'. Add check that request's current status matches the step's expected stage:tsx// Disable actions if it's not this step's turn yetconst isMyTurn = ((step.stage === 'STAGE_1_ADVISER' && request?.status === 'PENDING') ||(step.stage === 'STAGE_1_DEPT_HEAD' && request?.status === 'STAGE1_REVIEW') ||(['STAGE_2_MIS','STAGE_2_BUILDING','STAGE_2_ACADEMIC_HEAD','STAGE_2_HEAD_OF_STUDENT_AFFAIRS'].includes(step.stage) && request?.status === 'STAGE2_REVIEW') ||(step.stage === 'STAGE_3_SCHOOL_ADMIN' && request?.status === 'PENDING_FINAL'));

API EndpointsExisting EndpointsPOST   /api/auth/sign-up/emailPOST   /api/auth/sign-in/emailPOST   /api/auth/sign-outGET    /api/auth/get-session

GET    /api/v1/usersGET    /api/v1/users/meGET    /api/v1/users/PATCH  /api/v1/users//rolePATCH  /api/v1/users//toggle-activeDELETE /api/v1/users/

POST   /api/v1/requestsGET    /api/v1/requestsGET    /api/v1/requests/PATCH  /api/v1/requests/DELETE /api/v1/requests/POST   /api/v1/requests//submit        ← needs body { adviserId }

GET    /api/v1/approvals/pendingGET    /api/v1/approvals/request/GET    /api/v1/approvals/          ← added in last sessionPOST   /api/v1/approvals//approvePOST   /api/v1/approvals//reject

GET    /api/v1/venuesPOST   /api/v1/venuesGET    /api/v1/venues/PATCH  /api/v1/venues/DELETE /api/v1/venues/GET    /api/v1/venues//availabilityPATCH  /api/v1/venues//status

GET    /api/v1/assetsPOST   /api/v1/assetsGET    /api/v1/assets/PATCH  /api/v1/assets/DELETE /api/v1/assets/PATCH  /api/v1/assets//statusGET    /api/v1/assets/checkouts/activeGET    /api/v1/assets/import/templatePOST   /api/v1/assets/import/csvPOST   /api/v1/assets/checkout//processPOST   /api/v1/assets/checkout//return

POST   /api/v1/attachments/request/POST   /api/v1/attachments/step/GET    /api/v1/attachments/request/GET    /api/v1/attachments//downloadDELETE /api/v1/attachments/

GET    /api/v1/notificationsGET    /api/v1/notifications/unread-countPATCH  /api/v1/notifications//readPATCH  /api/v1/notifications/read-all

GET    /api/v1/audit-logsGET    /api/v1/audit-logs/GET    /api/v1/audit-logs/request/

GET    /api/v1/system-configPOST   /api/v1/system-configGET    /api/v1/system-config/PATCH  /api/v1/system-config/DELETE /api/v1/system-config/

POST   /graphql  (venueSchedule, assetSchedule, maintenanceSchedule, calendarSummary)Endpoints NeededGET    /api/v1/approvals/history          ← approver history (all statuses)GET    /api/v1/users?role=ADVISER         ← already works, used for adviser picker

Frontend PagesImplemented/                          → redirects to /dashboard/(auth)/login              ✅/(auth)/register           ✅/(dashboard)/dashboard     ✅ basic stats/(dashboard)/requests      ✅ with My Requests / For My Review tabs/(dashboard)/requests/new  ✅ 6-section form (missing adviser picker)/(dashboard)/requests/[id] ✅ detail + approval chain + owner actions/(dashboard)/approvals     ✅ pending queue/(dashboard)/approvals/[stepId] ✅ dedicated approver view/(dashboard)/users         ✅ list + create modal/(dashboard)/users/[id]    ✅ role assignment + danger zoneNot Implemented/(dashboard)/approvals/history    ← approver history/(dashboard)/requests/[id]/edit   ← edit existing request (link exists, page missing)/(dashboard)/venues               ← venue list/(dashboard)/venues/[id]          ← venue detail + availability calendar/(dashboard)/assets               ← asset list/(dashboard)/assets/[id]          ← asset detail/(dashboard)/schedules            ← calendar view (GraphQL)/(dashboard)/notifications        ← notification inbox/(dashboard)/audit-logs           ← admin only/(dashboard)/system-config        ← super admin only

Frontend Data Layer (all in apps/frontend/app/lib/)Implemented modulesaxios.ts           ✅ shared Axios instance, 401 interceptortypes.ts           ✅ IPaginationMeta, IPaginatedResponse, IApiErrorauth/              ✅ types, api, hooks (useSession, useSignIn, useSignOut, useCurrentUser)requests/          ✅ types (with approverId on IRequestApprovalStep), api, hooksapprovals/         ✅ types, api (with getStepById), hooks (with useApprovalStep, polling)users/             ✅ types, api (with createUser), hooks (with useCreateUser)venues/            ✅ types, api, hooks (pages not built yet)assets/            ✅ types, api, hooks (pages not built yet)attachments/       ✅ types, api, hooks (not wired to UI)notifications/     ✅ types, api, hooks (page not built)audit-logs/        ✅ types, api, hooks (page not built)system-config/     ✅ types, api, hooks (page not built)schedules/         ✅ types, api (GraphQL), hooks (page not built)query-client.tsx   ✅ QueryProvider wrapper

Known BugsBugStatusFixAdviser auto-picks first in DBOpenOption B implementation needed403 on /requests/ for approversOpenfindOne service fix neededSelf-approval possibleOpenExclude requestor from resolveApproversNo turn-based action lockOpenAdd isMyTurn check to approval pageDept Head not routed by departmentOpenMatch requestor's department field/requests/[id]/edit page missingOpenBuild edit page

Remaining Tasks — PrioritizedHIGH PRIORITYH1: Adviser Selection (Option B)

Create SubmitRequestDto with adviserIdUpdate submit controller, service, repositoryUpdate resolveApprovers to accept explicit adviserIdUpdate step order in submitRequestAdd adviser picker dropdown to /requests/newUpdate submitRequest in frontend API to send bodyUpdate useSubmitRequest hook

H2: Self-Approval Restriction

In resolveApprovers, pass and exclude requestedByIdIn /approvals/[stepId], add isMyTurn check before showing buttonsBackend: assertCanAct already validates approverId but doesn't check stage turn

H3: Fix 403 on Request Detail for Approvers

In requests.service.ts findOne:

tsconst isApprover = request.approvalSteps?.some(s => s.approverId === userId);if (isApprover) return request;

This is written but may not be saved/restarted correctly

H4: Edit Request Page

/requests/[id]/edit — same form as new, pre-populated with existing dataUses useUpdateRequest hook (already exists)

H5: Department Head Routing by Department

Fetch requestor's department in submit flowMatch to DEPARTMENT_HEAD with same department

MEDIUM PRIORITYM1: Approver History Dashboard

New endpoint: GET /api/v1/approvals/history (all statuses for current user)New page: /approvals/history or add tabs to /approvalsFilter by: PENDING, APPROVED, REJECTED, ALL

M2: Notifications Page

/notifications — paginated inbox using existing useNotifications hookMark read, mark all readUnread badge on sidebar

M3: Venues Pages

/venues — list with search, status filter/venues/[id] — detail with availability calendar

M4: Assets Pages

/assets — list scoped by custodian role/assets/[id] — detail with checkout history

M5: Approval Chain Visibility

Allow all assigned approvers to view request regardless of current stageShow locked/unlocked state on approval step UI

M6: Real-Time Notifications

Connect frontend WebSocket client to /notifications namespaceOn notification.new event, invalidate relevant TanStack Query caches

LOW PRIORITYL1: System Config Page (/system-config)

L2: Audit Logs Page (/audit-logs)

L3: Schedule/Calendar Page (/schedules)

L4: Dashboard Stats — request counts, pending approvals count

L5: Microsoft 365 SSO — add to Better Auth config, role assignment UI already ready

L6: Attachment UI — upload/download on request detail page

L7: Progress Bar Component — visual approval timeline

Current Project StateWorking ✅

Authentication (login, register, session, sign out)Request CRUD (create, view, cancel, submit as DRAFT→PENDING)Approval workflow end-to-end (all 7 steps tested and passing)User management (create with role, assign role, toggle active, delete)Role-based navigation (sidebar hides items by role)PrismaService injection (all repositories working)Audit logging (all major events logged)Polling-based updates (15-30s refresh on approval pages)

Partially Complete ⚠️

Request detail visibility for approvers (403 fix written but not confirmed working)Adviser selection (discussed, not implemented — still auto-picks first)Approval progress tracking (dots on list, full timeline not built)Real-time updates (polling works, WebSocket not connected to query cache)Approver request view (tabs exist but "For My Review" uses assignedApproverId which is correct)

Blocked 🔴

Full adviser selection flow blocked until SubmitRequestDto added and form updatedDepartment Head routing blocked until requestor department is passed to resolveApproversSelf-approval restriction blocked until requestor excluded from auto-resolve

Implement Next (in order)

H3: Fix 403 on request detail for approvers (5 min backend fix)H2: Self-approval restriction (exclude requestor in resolveApprovers)H1: Option B adviser selection (new DTO + form picker)H5: Department Head routing by departmentH4: Edit request pageM1: Approver history dashboardM2: Notifications pageM3/M4: Venues and Assets pages

Environment SetupBackend .env required keysDATABASE_URL=postgresql://...BETTER_AUTH_SECRET=<32+ char random string>FRONTEND_URL=http://localhost:60000NODE_ENV=developmentPORT=60001Frontend .env.localNEXT_PUBLIC_API_URL=http://localhost:60001/api/v1Frontend env.tstsexport const env = {apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:60001/api/v1',};Running locallybash# Terminal 1 — backendpnpm --filter backend dev

Terminal 2 — frontend

pnpm --filter frontend dev

Or both together

pnpm devSeedingbashpnpm --filter @repo/database exec prisma db seed

Then register admin via POST /api/auth/sign-up/email

Then set role to SUPER_ADMIN via Prisma Studio or Users page

Package Versions (critical)json{"better-auth": "^1.6.11","@thallesp/nestjs-better-auth": "^2.6.0","@prisma/client": "^5.22.0","next": "16.2.0","tailwindcss": "3.4.19","@tanstack/react-query": "5.100.14"}Note: Tailwind v4 was attempted and caused memory crashes with Turbopack. Reverted to v3. Next.js 16 uses Turbopack by default — cannot be disabled. Memory issues resolved after switching from Tailwind v4 to v3.

This document represents the complete state of the RACA Platform as of the end of this conversation. The next conversation should begin with H3 (fix 403 for approvers) and proceed through the HIGH PRIORITY tasks in order.