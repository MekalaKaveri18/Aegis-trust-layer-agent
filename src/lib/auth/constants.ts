export const SESSION_COOKIE = "aegis_session";

export const DEMO_USER = {
  id: "user_demo",
  name: "Aegis Demo",
  email: "demo@aegis.local",
} as const;

export function sessionCookieSecure(request?: Request) {
  if (process.env.AUTH_SECURE_COOKIE === "false") return false;
  if (process.env.AUTH_SECURE_COOKIE === "true") return true;
  const forwarded = request?.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  if (forwarded) return forwarded === "https";
  if (request) return new URL(request.url).protocol === "https:";
  return (process.env.APP_BASE_URL || "https://127.0.0.1:43147").startsWith("https");
}
