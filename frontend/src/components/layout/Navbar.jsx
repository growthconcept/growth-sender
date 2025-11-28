import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { LogOut, User } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b bg-white">
      <div className="flex h-16 items-center px-8">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="text-xl font-bold">Growth Sender</span>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">{user?.name}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </nav>
  );
}
