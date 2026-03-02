import { createNavigation } from 'next-intl/navigation';
import { localeConfig } from './config';

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(localeConfig);

// Re-export useSearchParams from next/navigation as it's not locale-specific
export { useSearchParams } from 'next/navigation';
