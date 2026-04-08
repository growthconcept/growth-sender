import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Link as LinkIcon, FileText, Send, History, Shield, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/contexts/SidebarContext';

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard
  },
  {
    title: 'Conexões',
    href: '/connections',
    icon: LinkIcon
  },
  {
    title: 'Templates',
    href: '/templates',
    icon: FileText
  },
  {
    title: 'Campanhas',
    href: '/campaigns',
    icon: Send
  },
  {
    title: 'Histórico',
    href: '/history',
    icon: History
  },
  {
    title: 'Administração',
    href: '/admin',
    icon: Shield,
    adminOnly: true
  }
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { collapsed, toggleCollapsed, mobileOpen, closeMobile } = useSidebar();

  const visibleItems = menuItems.filter(item => !item.adminOnly || user?.role === 'admin');

  const NavItems = () => (
    <>
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;

        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={closeMobile}
            title={collapsed ? item.title : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors',
              collapsed ? 'justify-center' : '',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span
              className={cn(
                'overflow-hidden whitespace-nowrap transition-all duration-300',
                collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
              )}
            >
              {item.title}
            </span>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 top-16 z-40 bg-black/50 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Mobile sidebar — overlay drawer */}
      <aside
        className={cn(
          'fixed top-16 left-0 bottom-0 z-50 w-64 border-r bg-background flex flex-col transition-transform duration-300 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm font-semibold text-muted-foreground">Menu</span>
          <button
            onClick={closeMobile}
            className="p-1 rounded hover:bg-accent text-muted-foreground"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItems />
        </nav>
      </aside>

      {/* Desktop sidebar — collapsible */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r bg-background h-[calc(100vh-4rem)] transition-all duration-300 flex-shrink-0',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Toggle collapse button — topo, estilo Notion */}
        <div
          className={cn(
            'flex items-center border-b px-2 py-2 flex-shrink-0',
            collapsed ? 'justify-center' : 'justify-end'
          )}
        >
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
          <NavItems />
        </nav>
      </aside>
    </>
  );
}
