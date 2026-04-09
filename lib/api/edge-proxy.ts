import { z } from "zod";

function createErrorResponse(status: number, error: string, code: string): Response {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function validateEdgeProxyRequest<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ authHeader: string; data: T } | Response> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !/^Bearer\s+\S+$/i.test(authHeader.trim())) {
    return createErrorResponse(401, "Unauthorized", "UNAUTHORIZED");
  }

  const contentType = request.headers.get("content-type");
  if (!contentType || !contentType.toLowerCase().includes("application/json")) {
    return createErrorResponse(415, "Unsupported Media Type", "UNSUPPORTED_MEDIA_TYPE");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(400, "Invalid request data", "INVALID_REQUEST");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return createErrorResponse(400, "Invalid request data", "INVALID_REQUEST");
  }

  return {
    authHeader: authHeader.trim(),
    data: parsed.data,
  };
}
