/**
 * Messages of the .NET `SerilogLogger`. Serilog resolves the placeholders of a
 * template into structured properties; pino takes the properties as an object
 * and the template as a plain message, so the placeholders live in the fields.
 */
export const ON_ENTRY_MESSAGE = 'Start Call.';
export const ON_CALL_MESSAGE = 'End Call.';
export const ON_EXIT_MESSAGE = 'End Call.';
export const ON_EXCEPTION_MESSAGE = 'Exception.';
