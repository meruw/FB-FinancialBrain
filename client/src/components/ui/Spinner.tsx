export function Spinner() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      className="animate-spin text-brain-accent"
      aria-label="Loading"
      role="status"
    >
      <circle
        cx={10}
        cy={10}
        r={8}
        stroke="currentColor"
        strokeWidth={2.5}
        className="opacity-20"
      />
      <path
        d="M18 10a8 8 0 0 0-8-8"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
