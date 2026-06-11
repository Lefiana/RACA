// File: apps/frontend/components/layout/sidebar.tsx
// Purpose: Role-aware sidebar navigation
// Dependencies: next/link, next/navigation, IUser
'use client';

import Link                       from 'next/link';
import { usePathname }            from 'next/navigation';
import type { IUser }             from 'app/lib/auth/types';

// Nav item definition
interface INavItem {
  label:  string;
  href:   string;
  roles?: string[]; // undefined = visible to all
}

const NAV_ITEMS: INavItem[] = [
  { label: 'Dashboard',     href: '/dashboard'                                                                          },
  { label: 'My Requests',   href: '/requests',    roles: ['REQUESTOR', 'ADVISER', 'DEPARTMENT_HEAD', 'SUPER_ADMIN']                   },
  { label: 'Approvals',     href: '/approvals',   roles: ['ADVISER', 'DEPARTMENT_HEAD', 'MIS', 'BUILDING_ADMIN', 'STUDENT_AFFAIRS', 'ACADEMIC_HEAD', 'SCHOOL_ADMIN'] },
  { label: 'Venues',        href: '/venues'                                                                              },
  { label: 'Assets',        href: '/assets'                                                                              },
  { label: 'Schedule',      href: '/schedules'                                                                           },
  { label: 'Notifications', href: '/notifications'                                                                       },
  { label: 'Users',         href: '/users',        roles: ['SCHOOL_ADMIN', 'SUPER_ADMIN']                               },
  { label: 'Audit Logs',    href: '/audit-logs',   roles: ['SCHOOL_ADMIN', 'SUPER_ADMIN']                               },
  { label: 'System Config', href: '/system-config', roles: ['SUPER_ADMIN']                                              },
];

interface SidebarProps {
  user: IUser;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.roles || item.roles.includes(user.role),
  );

  return (
    <aside className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <div>
          <p className="text-sm font-semibold text-sidebar-foreground">RACA Platform</p>
          <p className="text-xs text-muted-foreground">STI Academic Center Cubao</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map(item => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info at bottom */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs font-medium text-sidebar-foreground truncate">{user.name}</p>
        <p className="text-xs text-muted-foreground truncate">{user.role}</p>
      </div>
    </aside>
  );
}