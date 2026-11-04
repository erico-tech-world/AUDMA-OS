import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userEmail?: string;
    userFullName?: string;
    userRole?: string;
    userPermissions?: string[];
  }
}
