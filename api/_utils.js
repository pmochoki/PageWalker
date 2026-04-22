const rateLimitBuckets = new Map();

function randomId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").trim();
  if (forwarded) return forwarded.split(",")[0].trim();
  return String(req.headers["x-real-ip"] || "unknown");
}

function withRequestContext(req, res, routeName) {
  const requestId = String(req.headers["x-request-id"] || randomId());
  const ip = getClientIp(req);
  res.setHeader("x-request-id", requestId);
  return { requestId, ip, routeName, startedAt: Date.now() };
}

function applyRateLimit(res, context, opts) {
  const windowMs = Math.max(1000, Number(opts?.windowMs || 60000));
  const max = Math.max(1, Number(opts?.max || 60));
  const key = `${context.routeName}:${context.ip}`;
  const now = Date.now();

  const record = rateLimitBuckets.get(key);
  if (!record || now >= record.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  record.count += 1;
  if (record.count <= max) return true;

  const retrySeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
  res.setHeader("Retry-After", String(retrySeconds));
  res.status(429).json({
    error: "rate_limited",
    message: "Too many requests. Please try again shortly.",
    requestId: context.requestId,
  });
  return false;
}

function sendError(res, context, status, publicError, details) {
  const payload = {
    level: "error",
    route: context.routeName,
    requestId: context.requestId,
    status,
    elapsedMs: Date.now() - context.startedAt,
    message: String(details?.message || details || publicError),
  };
  console.error(JSON.stringify(payload));
  return res.status(status).json({
    error: publicError,
    requestId: context.requestId,
  });
}

module.exports = {
  withRequestContext,
  applyRateLimit,
  sendError,
};
