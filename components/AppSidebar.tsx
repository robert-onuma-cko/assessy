'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PaperPlaneTilt,
  Tray,
  Funnel,
  HouseSimple,
  GearSix,
} from '@phosphor-icons/react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { ScoutMark } from '@/components/ScoutMark';

// The daily destinations, one per actor in the triage journey (design §3):
// requesters submit and track, triage owners work the queue, domain owners
// confirm. Admin is reference-data CRUD — footer, not primary nav.
const NAV: { href: string; label: string; icon: typeof Tray; match: (p: string) => boolean }[] = [
  {
    href: '/requests/new',
    label: 'New request',
    icon: PaperPlaneTilt,
    match: (p) => p === '/requests/new',
  },
  {
    href: '/',
    label: 'My requests',
    icon: Tray,
    // A request record belongs to "My requests" — except the new-request page,
    // which is its own destination above.
    match: (p) => p === '/' || (p.startsWith('/requests/') && p !== '/requests/new'),
  },
  { href: '/triage', label: 'Triage', icon: Funnel, match: (p) => p.startsWith('/triage') },
  { href: '/my-work', label: 'My work', icon: HouseSimple, match: (p) => p.startsWith('/my-work') },
];

const BOTTOM_NAV = [
  { href: '/admin', label: 'Admin', icon: GearSix, match: (p: string) => p.startsWith('/admin') },
];

export function AppSidebar({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/"
          aria-label="Assessy home"
          className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 ring-sidebar-ring outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:px-0"
        >
          <ScoutMark size={32} className="size-8 shrink-0" />
          <span className="font-semibold text-sm truncate group-data-[collapsible=icon]:hidden">
            Assessy
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ href, label, icon: Icon, match }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={match(pathname)} tooltip={label}>
                    <Link href={href}>
                      <Icon weight="regular" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {BOTTOM_NAV.map(({ href, label, icon: Icon, match }) => (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton asChild isActive={match(pathname)} tooltip={label}>
                <Link href={href}>
                  <Icon weight="regular" />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <ThemeSwitch theme={theme} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
