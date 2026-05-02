import type { Route } from "next"

function r<T extends string>(path: T): Route<T> {
  return path as Route<T>
}

export const ROUTES = {
  home: r("/"),
  auth: {
    login: r("/auth/login"),
    register: r("/auth/register"),
    forgotPassword: r("/auth/forgot-password"),
    resetPassword: r("/auth/reset-password"),
  },
} as const
