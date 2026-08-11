/**
 * Default auth route paths shared by landlord-web and resident-web.
 * Apps may keep a local ROUTES for typed Next routes; these paths must match.
 */
export const ROUTES = {
  home: "/",
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
  },
} as const
