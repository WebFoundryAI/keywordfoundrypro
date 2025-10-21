/**
 * Development-only logger utility
 * Automatically disabled in production builds
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },

  error: (...args: any[]) => {
    if (isDev) console.error(...args);
  },

  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },

  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },
};
