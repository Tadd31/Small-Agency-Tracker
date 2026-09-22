// Auto-managed application version configuration
export const BASE_VERSION = '1.3';

/**
 * Automatically computes or reads the updated application version string.
 * Automatically updates upon server restarts, builds, or code changes.
 */
const getAutoVersion = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APP_VERSION) {
    return import.meta.env.VITE_APP_VERSION;
  }
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateCode = `${now.getFullYear().toString().slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timeCode = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `V ${BASE_VERSION}.${dateCode}.${timeCode}`;
};

export const APP_VERSION = getAutoVersion();
