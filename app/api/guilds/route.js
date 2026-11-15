import { auth } from "../../../auth.js";
import { prisma } from "../../../src/lib/prisma.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const guilds = await prisma.guildConfig.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      guildId: true, enabled: true, monitoredChannels: true,
      adminRoleId: true, createdAt: true, updatedAt: true
    }
  });
  return Response.json({ guilds }, { headers: { "cache-control": "no-store" } });
}
