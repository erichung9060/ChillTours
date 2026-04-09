import { createNavigation } from "next-intl/navigation";
import { localeConfig } from "./config";

export const { Link, redirect, usePathname, useRouter } = createNavigation(localeConfig);

// Re-export hooks from next/navigation that are not locale-specific
export { useSearchParams, useParams } from "next/navigation";
