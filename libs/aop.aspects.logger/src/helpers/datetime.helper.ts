/**
 * UTC timestamp used by the message templates.
 *
 * Inlined from `@nestjslatam/core-lib`, which is no longer resolvable from the
 * public npm registry. The output format is kept identical so existing log
 * parsers keep working: `YYYY-MM-DDTH:M:S:ms`.
 */
export const getUtcDate = (): Date => {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
};

export const getUtcDateTimeFormatted = (): string => {
  const now = new Date();

  const date = getUtcDate().toISOString().split('T')[0];

  return `${date}T${now.getUTCHours()}:${now.getUTCMinutes()}:${now.getUTCSeconds()}:${now.getUTCMilliseconds()}`;
};
