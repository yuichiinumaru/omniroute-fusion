import { NextResponse } from "next/server";
import { z } from "zod";
import { getRelayTokens, createRelayToken, type RelayToken } from "@/lib/db/relayProxies";
import { isValidationFailure, validateBody } from "@/shared/validation/helpers";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { sanitizeErrorMessage } from "@omniroute/open-sse/utils/error";

const relayTokenInputSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  description: z.string().optional(),
  comboId: z.string().trim().min(1).optional(),
  allowedModels: z.array(z.string().trim().min(1)).optional(),
  maxTokensPerRequest: z.number().int().positive().optional(),
  maxRequestsPerMinute: z.number().int().positive().optional(),
  maxRequestsPerDay: z.number().int().positive().optional(),
  maxCostPerDay: z.number().nonnegative().optional(),
  expiresAt: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/** Public list/detail shape — never includes tokenHash (F-07-007). */
export function toPublicRelayToken(token: RelayToken) {
  return {
    id: token.id,
    name: token.name,
    tokenPrefix: token.tokenPrefix,
    description: token.description,
    comboId: token.comboId,
    allowedModels: token.allowedModels,
    maxTokensPerRequest: token.maxTokensPerRequest,
    maxRequestsPerMinute: token.maxRequestsPerMinute,
    maxRequestsPerDay: token.maxRequestsPerDay,
    maxCostPerDay: token.maxCostPerDay,
    enabled: token.enabled,
    createdAt: token.createdAt,
    updatedAt: token.updatedAt,
    expiresAt: token.expiresAt,
    lastUsedAt: token.lastUsedAt,
  };
}

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request, { always: true });
  if (authError) return authError;

  const tokens = getRelayTokens();
  return NextResponse.json(tokens.map(toPublicRelayToken));
}

export async function POST(request: Request) {
  const authError = await requireManagementAuth(request, { always: true });
  if (authError) return authError;

  try {
    const rawBody = await request.json();
    const validation = validateBody(relayTokenInputSchema, rawBody);
    if (isValidationFailure(validation)) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const token = createRelayToken(validation.data);

    // rawToken only once on create; never return tokenHash
    return NextResponse.json({
      id: token.id,
      name: token.name,
      rawToken: token.rawToken,
      tokenPrefix: token.tokenPrefix,
    });
  } catch (error) {
    return NextResponse.json({ error: sanitizeErrorMessage(error) }, { status: 400 });
  }
}
