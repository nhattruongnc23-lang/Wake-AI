export async function writeAudit(prisma, {
  actorId = null,
  action,
  targetType,
  targetId,
  metadata = undefined
}) {
  return prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetType,
      targetId,
      ...(metadata === undefined ? {} : { metadata })
    }
  });
}
