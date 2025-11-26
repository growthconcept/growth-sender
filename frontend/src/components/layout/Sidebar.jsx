import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Link as LinkIcon, FileText, Send, History } from 'lucide-react';

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
  }
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 border-r bg-white h-[calc(100vh-4rem)]">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}