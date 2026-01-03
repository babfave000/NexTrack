// src/components/StatCard.tsx

import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  color?: string; // Tailwind color class, e.g., 'bg-blue-600'
  icon?: ReactNode;
  footer?: string;
}

export default function StatCard({
  title,
  value,
  color = 'bg-blue-600',
  icon,
  footer,
}: StatCardProps) {
  return (
    <section
      className={`rounded-lg p-4 sm:p-5 text-white shadow-md flex flex-col justify-between ${color}`}
      aria-label={title}
    >
      {/* Header: Title & Icon */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm sm:text-base font-medium">{title}</h3>
        {icon && <div className="text-white text-xl">{icon}</div>}
      </div>

      {/* Value Display */}
      <div className="text-3xl sm:text-4xl font-bold">{value}</div>

      {/* Optional Footer */}
      {footer && (
        <p className="mt-2 text-xs sm:text-sm text-white/80 dark:text-white/60 italic">
          {footer}
        </p>
      )}
    </section>
  );
}
