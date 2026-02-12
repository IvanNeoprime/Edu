import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive', size?: 'xs' | 'sm' | 'md' | 'lg' }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-black text-white hover:bg-gray-800 shadow-sm border border-transparent',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-transparent',
      outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-900',
      ghost: 'hover:bg-gray-100 text-gray-700',
      destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm border border-transparent',
    };
    const sizes = {
      xs: 'h-7 px-2 text-[10px] font-bold uppercase tracking-wider',
      sm: 'h-8 px-3 text-[11px] font-bold uppercase tracking-wider',
      md: 'h-9 px-4 py-2 text-xs font-bold uppercase tracking-wider',
      lg: 'h-11 px-6 text-sm font-bold uppercase tracking-wider',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm transition-all',
          className
        )}
        {...props}
      />
    );
  }
);

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-gray-100 bg-white text-gray-950 shadow-sm transition-all', className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1 p-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-black leading-none tracking-tight uppercase', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pt-0', className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-[10px] font-black uppercase tracking-widest leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-400', className)} {...props} />;
}

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
    ({ className, children, ...props }, ref) => {
      return (
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'flex h-9 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 appearance-none shadow-sm text-gray-900 transition-all font-medium',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-3 top-2.5 pointer-events-none opacity-30">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      );
    }
  );