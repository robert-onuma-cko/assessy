import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { DevUserSwitcher } from '@/components/dev/DevUserSwitcher';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { readTheme } from '@/lib/theme';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Assessy',
  description: 'CKO request intake and AI triage — Scout structures the facts; your domain team decides.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Theme is read server-side from a cookie (Hive pattern). Dark is the design
  // target and the default; light is an explicit opt-in from the sidebar pill.
  const theme = await readTheme();

  return (
    <html lang="en" className={`${theme} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar theme={theme} />
            <SidebarInset>
              <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <div className="ml-auto flex items-center gap-2">
                  <DevUserSwitcher />
                </div>
              </header>
              <main className="flex flex-1 flex-col">{children}</main>
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
        <Toaster theme={theme} />
      </body>
    </html>
  );
}
