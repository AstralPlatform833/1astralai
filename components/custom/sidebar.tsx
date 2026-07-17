'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Bot,
  AreaChart,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
  { label: 'Trading', href: '/trading', icon: <TrendingUp className="h-4.5 w-4.5" /> },
  { label: 'Analytics', href: '/analytics', icon: <BarChart3 className="h-4.5 w-4.5" /> },
  { label: 'Bots', href: '/bots', icon: <Bot className="h-4.5 w-4.5" /> },
  { label: 'Charts', href: '/charts', icon: <AreaChart className="h-4.5 w-4.5" /> },
  { label: 'Settings', href: '/settings', icon: <Settings className="h-4.5 w-4.5" /> },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div
      className={cn(
        'flex h-full flex-col bg-slate-950 border-r border-slate-800/60 transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* BRAND SECTION */}
      <div
        className={cn(
          'flex items-center border-b border-slate-800/60 h-14 md:h-16 shrink-0',
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}
      >
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 text-blue-500 shadow-sm">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="font-sans font-bold tracking-tight text-foreground text-sm flex items-center gap-1.5 whitespace-nowrap">
              ASTRAL{' '}
              <span className="text-[10px] bg-blue-600 text-white font-mono uppercase px-1 rounded font-semibold tracking-wider">
                PRO
              </span>
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/" className="flex items-center justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 text-blue-500 shadow-sm">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'hidden lg:flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-slate-800/60 transition-colors',
            collapsed && 'absolute -right-3 top-4 bg-slate-900 border border-slate-800 shadow-md'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg transition-all duration-200 group',
                collapsed ? 'justify-center h-10 w-12 mx-auto' : 'px-3 py-2.5',
                active
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className={cn('shrink-0', active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300')}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="text-xs font-semibold tracking-wide truncate">{item.label}</span>
              )}
              {active && !collapsed && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* BOTTOM SECTION */}
      <div
        className={cn(
          'border-t border-slate-800/60 py-3 shrink-0',
          collapsed ? 'flex flex-col items-center gap-2 px-1' : 'px-3'
        )}
      >
        <div className={cn('flex items-center gap-2', collapsed && 'flex-col')}>
          <span
            className={cn(
              'relative flex h-2 w-2',
              'text-green-500'
            )}
          >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          {!collapsed && (
            <span className="text-[10px] font-mono text-slate-500 font-medium uppercase tracking-wider">
              System Online
            </span>
          )}
        </div>
        {!collapsed && (
          <p className="text-[9px] text-slate-600 mt-1 font-mono">
            Astral v1.2
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside
        className={cn(
          'hidden lg:flex flex-col shrink-0 h-dvh sticky top-0',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {sidebarContent}
      </aside>

      {/* MOBILE HAMBURGER BUTTON */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* MOBILE SIDEBAR DRAWER */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full">
          {sidebarContent}
          <button
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center h-10 w-10 mt-3 text-slate-400 hover:text-slate-200"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </aside>
    </>
  );
}