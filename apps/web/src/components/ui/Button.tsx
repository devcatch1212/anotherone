import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth = false, loading = false, children, className, disabled, ...props },
  ref
) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants: Record<Variant, string> = {
    primary: 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] active:opacity-90 text-white shadow-sm shadow-[var(--color-primary-light)]',
    secondary: 'bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 border border-gray-200 shadow-sm',
    danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-sm shadow-red-200',
    ghost: 'bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-600',
  };

  const sizes: Record<Size, string> = {
    sm: 'h-9 px-4 text-sm gap-1.5',
    md: 'h-12 px-5 text-base gap-2',
    lg: 'h-14 px-6 text-lg gap-2',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : children}
    </button>
  );
});
