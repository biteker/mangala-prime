import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@mangala/shared';
import { RolesGuard } from './roles.guard';

function createMockContext(userRole?: UserRole): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: userRole
          ? { id: 'user-1', username: 'tester', role: userRole }
          : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('should_allow_access_when_no_roles_metadata_is_defined', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createMockContext('STUDENT'))).toBe(true);
  });

  it('should_allow_access_when_user_has_required_role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['TEACHER', 'ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createMockContext('TEACHER'))).toBe(true);
    expect(guard.canActivate(createMockContext('ADMIN'))).toBe(true);
  });

  it('should_throw_FORBIDDEN_when_student_accesses_teacher_or_admin_route', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['TEACHER', 'ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createMockContext('STUDENT'))).toThrow(
      ForbiddenException,
    );
  });

  it('should_throw_FORBIDDEN_when_request_has_no_authenticated_user', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createMockContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
