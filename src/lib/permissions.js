export const ROLE_LEVEL = Object.freeze({
  VIEWER: 1,
  ADMIN: 2,
  OWNER: 3
});

export function hasMinimumRole(role, minimum = "VIEWER") {
  return (ROLE_LEVEL[role] || 0) >= (ROLE_LEVEL[minimum] || Number.POSITIVE_INFINITY);
}

export function requireRole(user, minimum = "VIEWER") {
  if (!user || !hasMinimumRole(user.role, minimum)) {
    return Response.json({ error: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
  }
  return null;
}
