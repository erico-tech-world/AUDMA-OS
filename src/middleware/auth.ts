import { Request, Response, NextFunction } from 'express';
import { findUserById } from '../lib/auth';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    permissions: string[];
    is_active: boolean;
  };
  validatedBody?: any;
}

/**
 * Middleware: require a valid session user. Attaches req.user.
 * Returns 401 if no authenticated user.
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.session?.userId) {
    res.status(401).json({ code: 'UNAUTHENTICATED', error: 'Login required.' });
    return;
  }

  // Attach user from session (already validated at login; refreshed here for safety)
  // We trust the session store; the userId was set after successful authenticateUser.
  next();
}

/**
 * Middleware: optional auth. Attaches req.user if session exists, otherwise continues without.
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.session?.userId) {
    req.user = {
      id: req.session.userId,
      email: req.session.userEmail || '',
      full_name: req.session.userFullName || '',
      role: req.session.userRole || '',
      permissions: req.session.userPermissions || [],
      is_active: true,
    } as AuthenticatedRequest['user'];
  }
  next();
}

/**
 * Attach a resolved user to the session after successful authentication.
 */
export function setSessionUser(
  req: AuthenticatedRequest,
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    permissions: string[];
    is_active?: boolean;
  }
): void {
  req.session.userId = user.id;
  req.session.userEmail = user.email;
  req.session.userFullName = user.full_name;
  req.session.userRole = user.role;
  req.session.userPermissions = user.permissions;
  req.user = {
    ...user,
    is_active: user.is_active ?? true,
  } as NonNullable<AuthenticatedRequest['user']>;
}

/** Clear the authenticated session. */
export function clearSessionUser(req: AuthenticatedRequest): void {
  req.session.userId = undefined;
  req.session.userEmail = undefined;
  req.session.userFullName = undefined;
  req.session.userRole = undefined;
  req.session.userPermissions = undefined;
  req.user = undefined;
}

interface AuthenticatedRequestWithUser extends AuthenticatedRequest {
  user: NonNullable<AuthenticatedRequest['user']>;
}

/**
 * Middleware: require one or more specific permissions. User must have ALL listed permissions.
 * Accepts a single permission string or an array of permission strings.
 */
export function requirePermissions(requiredPermissions: string | string[]) {
  const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  return (_req: AuthenticatedRequest, _res: Response, _next: NextFunction): void => {
    const req = _req as AuthenticatedRequestWithUser;
    const res = _res;
    const next = _next;

    if (!req.user) {
      res.status(401).json({ code: 'UNAUTHENTICATED', error: 'Login required.' });
      return;
    }

    const missing = perms.filter((p) => !req.user.permissions.includes(p));
    if (missing.length > 0) {
      res.status(403).json({
        code: 'INSUFFICIENT_PERMISSIONS',
        error: `Missing required permissions: ${missing.join(', ')}`,
      });
      return;
    }
    next();
  };
}

/**
 * Middleware: require a specific role.
 */
export function requireRole(requiredRole: string) {
  return (_req: AuthenticatedRequest, _res: Response, _next: NextFunction): void => {
    const req = _req as AuthenticatedRequestWithUser;
    const res = _res;
    const next = _next;

    if (!req.user) {
      res.status(401).json({ code: 'UNAUTHENTICATED', error: 'Login required.' });
      return;
    }

    if (req.user!.role !== requiredRole) {
      res.status(403).json({
        code: 'INSUFFICIENT_ROLE',
        error: `Role '${requiredRole}' required.`,
      });
      return;
    }
    next();
  };
}

/**
 * Middleware: require any one of the listed permissions (OR logic).
 */
export function requireAnyPermission(permissions: string[]) {
  return (_req: AuthenticatedRequest, _res: Response, _next: NextFunction): void => {
    const req = _req as AuthenticatedRequestWithUser;
    const res = _res;
    const next = _next;

    if (!req.user) {
      res.status(401).json({ code: 'UNAUTHENTICATED', error: 'Login required.' });
      return;
    }

    const hasAny = permissions.some((p) => req.user!.permissions.includes(p));
    if (!hasAny) {
      res.status(403).json({
        code: 'INSUFFICIENT_PERMISSIONS',
        error: `One of the following permissions is required: ${permissions.join(', ')}`,
      });
      return;
    }
    next();
  };
}
