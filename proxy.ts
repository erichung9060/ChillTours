import createMiddleware from "next-intl/middleware";
import { localeConfig } from "./lib/i18n/config";

export default createMiddleware(localeConfig);

export const config = {
  // Match all pathnames except API routes, auth callback, and static files
  matcher: ["/((?!api|auth/callback|_next|_vercel|.*\\..*).*)"],
};
