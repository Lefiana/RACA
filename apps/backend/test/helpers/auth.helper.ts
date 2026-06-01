// File: apps/backend/test/helpers/auth.helper.ts
// CHANGED: after updating the role in DB, sign out and sign back in
// to get a fresh session cookie that reflects the new role

import supertest    from 'supertest';
import { prisma }  from '@repo/database';

export type TestRole =
  | 'REQUESTOR'
  | 'ADVISER'
  | 'DEPARTMENT_HEAD'
  | 'MIS'
  | 'BUILDING_ADMIN'
  | 'HRM_CUSTODIAN'
  | 'STUDENT_AFFAIRS'
  | 'ACADEMIC_HEAD'
  | 'SCHOOL_ADMIN'
  | 'SUPER_ADMIN';

export interface ITestUser {
  id:       string;
  email:    string;
  name:     string;
  role:     TestRole;
  cookie:   string;
  password: string;
}

let userCounter = 0;

export async function createTestUser(
  agent:      any,
  role:       TestRole,
  overrides?: { name?: string; email?: string },
): Promise<ITestUser> {
  userCounter++;

  const email    = overrides?.email ?? `test-${role.toLowerCase()}-${userCounter}-${Date.now()}@raca.test`;
  const name     = overrides?.name  ?? `Test ${role}`;
  const password = 'Test1234!';

  // Step 1 — sign up (creates user with REQUESTOR role)
  const signUpRes = await agent
    .post('/api/auth/sign-up/email')
    .send({ email, password, name })
    .expect(200);

  const userId = signUpRes.body.user?.id;
  if (!userId) {
    throw new Error(`Sign-up failed for ${email}: ${JSON.stringify(signUpRes.body)}`);
  }

  // Step 2 — update role directly in DB
  await prisma.user.update({
    where: { id: userId },
    data:  { role },
  });

  // Step 3 — sign out the current session (cookie has REQUESTOR role)
  const signUpCookie = signUpRes.headers['set-cookie'] as string | string[];
  await agent
    .post('/api/auth/sign-out')
    .set('Cookie', Array.isArray(signUpCookie) ? signUpCookie.join('; ') : signUpCookie);

  // Step 4 — sign back in to get a fresh session with the updated role
  const signInRes = await agent
    .post('/api/auth/sign-in/email')
    .send({ email, password })
    .expect(200);

  const rawCookie = signInRes.headers['set-cookie'] as string | string[];
  const cookie    = Array.isArray(rawCookie) ? rawCookie.join('; ') : rawCookie;

  return { id: userId, email, name, role, cookie, password };
}

export async function signInAs(
  agent:    any,
  email:    string,
  password: string = 'Test1234!',
): Promise<string> {
  const res = await agent
    .post('/api/auth/sign-in/email')
    .send({ email, password })
    .expect(200);

  const rawCookie = res.headers['set-cookie'] as string | string[];
  return Array.isArray(rawCookie) ? rawCookie.join('; ') : rawCookie;
}

export async function createRoleSet(
  agent: any,
): Promise<Record<TestRole, ITestUser>> {
  const roles: TestRole[] = [
    'REQUESTOR', 'ADVISER', 'DEPARTMENT_HEAD',
    'MIS', 'BUILDING_ADMIN', 'HRM_CUSTODIAN',
    'STUDENT_AFFAIRS', 'ACADEMIC_HEAD',
    'SCHOOL_ADMIN', 'SUPER_ADMIN',
  ];

  const entries = await Promise.all(
    roles.map(async role => [role, await createTestUser(agent, role)] as const),
  );

  return Object.fromEntries(entries) as Record<TestRole, ITestUser>;
}