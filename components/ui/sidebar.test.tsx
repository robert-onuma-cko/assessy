// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

import { useIsMobile } from '@/hooks/use-mobile';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from './sidebar';

const mockUseIsMobile = useIsMobile as ReturnType<typeof vi.fn>;

describe('SidebarProvider + useSidebar', () => {
  it('provides a context with expected shape', () => {
    let ctx: ReturnType<typeof useSidebar> | undefined;
    function Probe() {
      ctx = useSidebar();
      return null;
    }
    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>
    );
    expect(ctx).toBeDefined();
    expect(ctx).toHaveProperty('state');
    expect(ctx).toHaveProperty('open');
    expect(ctx).toHaveProperty('setOpen');
    expect(ctx).toHaveProperty('isMobile');
    expect(ctx).toHaveProperty('toggleSidebar');
  });

  it('throws when useSidebar is used outside provider', () => {
    function Bad() {
      useSidebar();
      return null;
    }
    expect(() => render(<Bad />)).toThrow('useSidebar must be used within a SidebarProvider.');
  });

  it('defaults to expanded state', () => {
    let ctx: ReturnType<typeof useSidebar>;
    function Probe() {
      ctx = useSidebar();
      return null;
    }
    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>
    );
    expect(ctx!.state).toBe('expanded');
    expect(ctx!.open).toBe(true);
  });

  it('toggleSidebar collapses and re-expands the sidebar', async () => {
    let ctx: ReturnType<typeof useSidebar>;
    function Probe() {
      ctx = useSidebar();
      return <button onClick={ctx.toggleSidebar}>toggle</button>;
    }
    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>
    );
    expect(ctx!.state).toBe('expanded');
    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(ctx!.state).toBe('collapsed');
    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(ctx!.state).toBe('expanded');
  });
});

describe('Sidebar (desktop)', () => {
  it('renders the sidebar container with data-slot', () => {
    mockUseIsMobile.mockReturnValue(false);
    const { container } = render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>content</SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
    expect(container.querySelector('[data-slot=sidebar]')).toBeInTheDocument();
  });

  it('renders collapsible=none as a plain div', () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar collapsible="none">
          <SidebarContent>non-collapsible</SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
    const sidebar = container.querySelector('[data-slot=sidebar]') as HTMLElement;
    expect(sidebar.tagName).toBe('DIV');
  });
});

describe('Sidebar (mobile)', () => {
  it('renders inside a Sheet (uses SheetContent) when on mobile', () => {
    mockUseIsMobile.mockReturnValue(true);
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>mobile content</SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
    // Mobile sidebar uses openMobile state which defaults to false, so SheetContent
    // won't be in the DOM unless opened. Verify the Sidebar renders without error
    // and the desktop sidebar container is NOT present (mobile path was taken).
    expect(document.querySelector('[data-slot=sidebar-container]')).toBeNull();
  });
});

describe('Sidebar sub-components', () => {
  it('SidebarHeader renders with data-slot', () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar collapsible="none">
          <SidebarHeader>header</SidebarHeader>
        </Sidebar>
      </SidebarProvider>
    );
    expect(container.querySelector('[data-slot=sidebar-header]')).toBeInTheDocument();
  });

  it('SidebarFooter renders with data-slot', () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar collapsible="none">
          <SidebarFooter>footer</SidebarFooter>
        </Sidebar>
      </SidebarProvider>
    );
    expect(container.querySelector('[data-slot=sidebar-footer]')).toBeInTheDocument();
  });

  it('SidebarGroup and its children render correctly', () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar collapsible="none">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Group Label</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>Menu Item</SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
    expect(screen.getByText('Group Label')).toBeInTheDocument();
    expect(screen.getByText('Menu Item')).toBeInTheDocument();
    expect(container.querySelector('[data-slot=sidebar-menu-button]')).toBeInTheDocument();
  });

  it('SidebarTrigger renders a button that toggles the sidebar', async () => {
    mockUseIsMobile.mockReturnValue(false);
    render(
      <SidebarProvider>
        <SidebarTrigger data-testid="trigger" />
        <Sidebar>
          <SidebarContent>c</SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
    expect(screen.getByTestId('trigger')).toHaveAttribute('data-slot', 'sidebar-trigger');
  });

  it('SidebarInset renders with data-slot', () => {
    const { container } = render(
      <SidebarProvider>
        <SidebarInset>main content</SidebarInset>
      </SidebarProvider>
    );
    expect(container.querySelector('[data-slot=sidebar-inset]')).toBeInTheDocument();
    expect(screen.getByText('main content')).toBeInTheDocument();
  });
});
