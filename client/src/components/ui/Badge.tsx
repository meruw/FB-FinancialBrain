type BadgeVariant = 'ok' | 'warn' | 'danger' | 'muted';

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  ok: 'bg-brain-ok/20 text-brain-ok',
  warn: 'bg-brain-warn/20 text-brain-warn',
  danger: 'bg-brain-danger/20 text-brain-danger',
  muted: 'bg-slate-700/60 text-brain-muted',
};

export function Badge({ label, variant }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses[variant]}`}
    >
      {label}
    </span>
  );
}
