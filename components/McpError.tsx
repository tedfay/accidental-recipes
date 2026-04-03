/**
 * Error state for when the MCP server is unreachable at runtime.
 *
 * This is not fallback content or placeholder text — it is an explicit
 * error state. Satisfies the CLAUDE.md constraint "Render what you
 * receive" because what was received is an error.
 */
export default function McpError({ error }: { error: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center dark:border-red-900 dark:bg-red-950"
    >
      <p className="text-sm font-medium text-red-800 dark:text-red-200">
        Unable to load data from the content server.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
