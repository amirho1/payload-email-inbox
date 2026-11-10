export class MailError extends Error {
  constructor(
    public code: 'denied' | 'invalid' | 'limit' | 'conflict' | 'unavailable' | 'notFound',
    public status = 400,
  ) {
    super(code)
  }
}

/** Never propagate parser, provider, DB or validation errors containing mail or credentials. */
export function errorResponse(error: unknown, correlationId: string): Response {
  return Response.json(
    { error: error instanceof MailError ? error.code : 'unavailable', correlationId },
    {
      status: error instanceof MailError ? error.status : 503,
      headers: { 'Cache-Control': 'no-store', 'X-Correlation-ID': correlationId },
    },
  )
}
