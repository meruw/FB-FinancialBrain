interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-slate-700 bg-brain-surface p-4 ${className}`}
    >
      {children}
    </div>
  );
}
