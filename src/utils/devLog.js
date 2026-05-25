// Tiny console wrapper that no-ops in production builds.
// Keeps debug breadcrumbs in dev/staging without paying the cost in prod.

const isDev = process.env.NODE_ENV !== 'production';

export const devLog = isDev ? console.log.bind(console) : () => {};
export const devWarn = isDev ? console.warn.bind(console) : () => {};
// Errors are always logged — production observability needs them.
export const devError = console.error.bind(console);
