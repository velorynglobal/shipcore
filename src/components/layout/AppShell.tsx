'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { cn, getInitials } from '@/lib/utils';
import {
  LayoutDashboard, Users, Globe2, Package, Boxes,
  FileText, FileCheck, BellRing, LogOut, Menu, X, ChevronRight,
  Bell, Settings, Shield, Bot, MessageSquare, IndianRupee,
  Building2, TrendingUp, FileSearch,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Operations',
    items: [
      { href: '/dashboard',       label: 'Dashboard',       icon: LayoutDashboard, roles: ['admin','operator','viewer'] },
      { href: '/enquiries',       label: 'Enquiries',       icon: FileSearch,      roles: ['admin','operator','viewer'] },
      { href: '/quotes',          label: 'Quotes',           icon: FileText,        roles: ['admin','operator','viewer'] },
      { href: '/jobs',            label: 'Jobs',             icon: Package,         roles: ['admin','operator','viewer'] },
      { href: '/consol',          label: 'Consol / LCL',    icon: Boxes,           roles: ['admin','operator','viewer'] },
      { href: '/customs',         label: 'Customs',          icon: FileCheck,       roles: ['admin','operator','viewer'] },
    ],
  },
  {
    label: 'CRM',
    items: [
      { href: '/customers',       label: 'Customers',       icon: Users,           roles: ['admin','operator','viewer'] },
      { href: '/agents',          label: 'Agents',           icon: Globe2,          roles: ['admin','operator','viewer'] },
      { href: '/vendors',         label: 'Vendors',          icon: Building2,       roles: ['admin','operator','viewer'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/invoices',        label: 'Invoices',         icon: FileText,        roles: ['admin','operator','viewer'] },
      { href: '/payments',        label: 'Payments',         icon: IndianRupee,     roles: ['admin','operator','viewer'] },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/notifications',   label: 'Notifications',   icon: BellRing,        roles: ['admin','operator'] },
      { href: '/agent-dashboard', label: 'AI Agents',        icon: Bot,             roles: ['admin'] },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/settings',        label: 'Settings',         icon: Settings,        roles: ['admin'] },
    ],
  },
];

// Flat list for page title lookup
const ALL_NAV = NAV_SECTIONS.flatMap(s => s.items);

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 h-full z-40 flex flex-col',
        'bg-shell-900 border-r border-shell-700/50',
        'w-64 transition-transform duration-300 ease-out',
        'lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-shell-700/50">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src="/veloryn-logo.jpg"
                alt="Veloryn Global Logistics"
                width={40} height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-white text-sm leading-tight tracking-tight truncate">
                Veloryn Global
              </div>
              <div className="text-[10px] text-brand-400 font-mono tracking-wider">ShipCore ERP</div>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-white p-1 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Company badge */}
        {user?.company && (
          <div className="mx-3 mt-3 px-3 py-2 bg-shell-800/80 rounded-lg border border-shell-700/40">
            <div className="text-[10px] text-slate-500 font-mono tracking-wider uppercase mb-1">Workspace</div>
            <div className="text-white text-xs font-medium truncate">{user.company.name}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <Shield className="w-3 h-3 text-brand-400" />
              <span className="text-brand-400 text-[10px] font-mono capitalize">{user.role}</span>
            </div>
          </div>
        )}

        {/* Sectioned Nav */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          {NAV_SECTIONS.map(section => {
            const visibleItems = section.items.filter(item => item.roles.includes(user?.role || 'viewer'));
            if (!visibleItems.length) return null;
            return (
              <div key={section.label}>
                <div className="text-[10px] text-slate-600 font-mono tracking-widest uppercase px-3 mb-1.5">
                  {section.label}
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map(item => {
                    const active = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link key={item.href} href={item.href} onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group',
                          active
                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40'
                            : 'text-slate-400 hover:text-white hover:bg-shell-800'
                        )}>
                        <item.icon className={cn('w-4 h-4 flex-shrink-0',
                          active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300')} />
                        <span className="flex-1">{item.label}</span>
                        {active && <ChevronRight className="w-3 h-3 opacity-60" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-shell-700/50">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {getInitials(user?.full_name || 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-medium truncate">{user?.full_name}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
            <button onClick={signOut}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all"
              title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const title = ALL_NAV.find(n => pathname.startsWith(n.href))?.label || 'ShipCore';

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64 min-h-screen flex flex-col">
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200/80 px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-slate-900 font-display font-semibold text-lg">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 animate-fade-in">{children}</main>
        <footer className="px-6 py-3 border-t border-slate-200 text-center">
          <span className="text-xs text-slate-400 font-mono">
            Veloryn Global Logistics • ShipCore Pro v2.0 • AGaaS
          </span>
        </footer>
      </div>
    </div>
  );
}
