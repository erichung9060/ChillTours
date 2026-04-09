import { z } from "npm:zod";
import { corsHeaders } from "./cors.ts";

function jsonError(status: number, error: string, code: string): Response {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function unauthorizedResponse(): Response {
  return jsonError(401, "Unauthorized", "UNAUTHORIZED");
}

export function invalidRequestResponse(): Response {
  return jsonError(400, "Invalid request data", "INVALID_REQUEST");
}

export async function parseJsonRequest<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return invalidRequestResponse();
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return invalidRequestResponse();
  }

  return { data: parsed.data };
}
