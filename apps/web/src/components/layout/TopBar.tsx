import { cn } from '@/lib/utils';

interface TopBarProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  className?: string;
}

export function TopBar({ title, subtitle, rightAction, className }: TopBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100',
        'flex items-center justify-between px-5',
        'h-14 safe-top',
        className
      )}
    >
      <div>
        <h1 className="font-bold text-gray-900 text-lg leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      {rightAction && <div>{rightAction}</div>}
    </header>
  );
}
