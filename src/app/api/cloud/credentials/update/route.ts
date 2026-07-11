import { NextResponse } from "next/server";
import { getProviderConnections, updateProviderConnection } from "@/models";
import { cloudCredentialUpdateSchema } from "@/shared/validation/schemas";
import { isValidationFailure, validateBody } from "@/shared/validation/helpers";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";

/**
 * PUT /api/cloud/credentials/update
 *
 * Refresh provider OAuth tokens for cloud/CLI workers.
 * Security (Task 0049 / F-07-006):
 *   - Not PUBLIC: only `/api/cloud/auth|model|models` stay public prefixes
 *   - ALWAYS_PROTECTED + requireManagementAuth({ always: true }) so open installs
 *     cannot overwrite OAuth material with an unscoped inference key
 *   - Optional `connectionId` binding; without it, only a single active
 *     connection for the provider may be updated (refuses ambiguous multi-conn)
 */
export async function PUT(request: Request) {
  const authError = await requireManagementAuth(request, { always: true });
  if (authError) return authError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          message: "Invalid request",
          details: [{ field: "body", message: "Invalid JSON body" }],
        },
      },
      { status: 400 }
    );
  }

  try {
    const validation = validateBody(cloudCredentialUpdateSchema, rawBody);
    if (isValidationFailure(validation)) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { provider, connectionId: requestedConnectionId, credentials } = validation.data;

    const connections = await getProviderConnections({ provider, isActive: true });

    let connection =
      requestedConnectionId != null
        ? connections.find((c) => c.id === requestedConnectionId)
        : undefined;

    if (requestedConnectionId && !connection) {
      return NextResponse.json(
        {
          error: `No active connection found for provider '${provider}' with id '${requestedConnectionId}'`,
        },
        { status: 404 }
      );
    }

    if (!connection) {
      if (connections.length === 0) {
        return NextResponse.json(
          { error: `No active connection found for provider: ${provider}` },
          { status: 404 }
        );
      }
      if (connections.length > 1) {
        return NextResponse.json(
          {
            error:
              "Multiple active connections for provider; provide connectionId to bind the update",
          },
          { status: 400 }
        );
      }
      connection = connections[0];
    }

    const updateData: Record<string, unknown> = {};
    if (credentials.accessToken) {
      updateData.accessToken = credentials.accessToken;
    }
    if (credentials.refreshToken) {
      updateData.refreshToken = credentials.refreshToken;
    }
    if (credentials.expiresIn) {
      updateData.expiresAt = new Date(Date.now() + credentials.expiresIn * 1000).toISOString();
    }

    const connectionId = typeof connection.id === "string" ? connection.id : null;
    if (!connectionId) {
      return NextResponse.json({ error: "Invalid provider connection ID" }, { status: 500 });
    }
    await updateProviderConnection(connectionId, updateData);

    return NextResponse.json({
      success: true,
      connectionId,
      message: `Credentials updated for provider: ${provider}`,
    });
  } catch (error) {
    console.log("Update credentials error:", error);
    return NextResponse.json({ error: "Failed to update credentials" }, { status: 500 });
  }
}
