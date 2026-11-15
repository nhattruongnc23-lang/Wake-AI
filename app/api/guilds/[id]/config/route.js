import { auth } from "../../../../../auth.js";
import { prisma } from "../../../../../src/lib/prisma.js";
import { requireRole } from "../../../../../src/lib/permissions.js";
import { writeAudit } from "../../../../../src/lib/audit.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validId = value => typeof value === "string" && /^\d{15,22}$/.test(value);

export async function GET(_request, context) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await context.params;
  if (!validId(id)) return Response.json({ error: "Invalid guild ID" }, { status: 400 });

  const config = await prisma.guildConfig.findUnique({ where: { guildId: id } });
  return Response.json({
    config: config || { guildId: id, enabled: false, monitoredChannels: [], adminRoleId: null }
  }, { headers: { "cache-control": "no-store" } });
}

export async function PUT(request, context) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthenticated" }, { status: 401 });
  const denied = requireRole(session.user, "ADMIN");
  if (denied) return denied;

  const { id } = await context.params;
  if (!validId(id)) return Response.json({ error: "Invalid guild ID" }, { status: 400 });

  let body;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 8 * 1024) return Response.json({ error: "Payload too large" }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body.enabled !== "boolean" ||
      !Array.isArray(body.monitoredChannels) || body.monitoredChannels.length > 100 ||
      body.monitoredChannels.some(channel => !validId(channel)) ||
      (body.adminRoleId != null && !validId(body.adminRoleId))) {
    return Response.json({ error: "Invalid guild configuration" }, { status: 400 });
  }

  try {
    const config = await prisma.$transaction(async tx => {
      const saved = await tx.guildConfig.upsert({
        where: { guildId: id },
        create: { guildId: id, enabled: body.enabled, monitoredChannels: [...new Set(body.monitoredChannels)], adminRoleId: body.adminRoleId || null },
        update: { enabled: body.enabled, monitoredChannels: [...new Set(body.monitoredChannels)], adminRoleId: body.adminRoleId || null }
      });
      await writeAudit(tx, {
        actorId: session.user.id,
        action: "GUILD_CONFIG_UPDATED",
        targetType: "GuildConfig",
        targetId: id,
        metadata: { enabled: body.enabled, monitoredChannelCount: new Set(body.monitoredChannels).size }
      });
      return saved;
    });
    return Response.json({ config }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Guild config update failed", error);
    return Response.json({ error: "Unable to update guild configuration" }, { status: 500 });
  }
}
