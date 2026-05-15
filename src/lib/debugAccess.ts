function isAuthorizedByAdminSecret(request: Request): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return false;
  }

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${adminSecret}`;
}

export function canUseDebugRoutes(request: Request): boolean {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  if (isDevelopment) {
    return true;
  }

  const debugEnabled = process.env.ENABLE_DEBUG_ROUTES === 'true';
  if (!debugEnabled) {
    return false;
  }

  return isAuthorizedByAdminSecret(request);
}
