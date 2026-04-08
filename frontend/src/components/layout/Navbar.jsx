import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User, Menu, ChevronDown } from 'lucide-react';
import Logo from '@/components/Logo';
import { useSidebar } from '@/contexts/SidebarContext';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { ModeToggle } from '@/components/ui/ModeToggle';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { toggleMobile } = useSidebar();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <nav className="border-b bg-background">
      <div className="flex h-16 items-center px-4 md:px-8">
        <button
          onClick={toggleMobile}
          className="mr-3 p-2 rounded-lg hover:bg-accent text-muted-foreground md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="text-xl font-bold">Growth Sender</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent transition-colors text-sm font-medium">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                  {initials}
                </div>
                <span className="hidden sm:block max-w-[120px] truncate">{user?.name}</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-0" align="end">
              <div className="px-3 py-3 border-b">
                <p className="text-sm font-semibold truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
              </div>
              <div className="p-1">
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-not-allowed opacity-60"
                  disabled
                  title="Em breve"
                >
                  <User className="h-4 w-4" />
                  Meu perfil
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </nav>
  );
}
