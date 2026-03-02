import { createSharedPathnamesNavigation } from 'next-intl/navigation';
import { localeConfig } from './config';

export const { Link, redirect, usePathname, useRouter } =
  createSharedPathnamesNavigation(localeConfig);
