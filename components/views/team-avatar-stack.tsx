interface TeamAvatarStackProps {
  members: string[];
}

export function TeamAvatarStack({ members }: TeamAvatarStackProps) {
  return (
    <div className="flex -space-x-1 overflow-hidden">
      {members.slice(0, 3).map((initials, idx) => (
        <span
          key={`${initials}-${idx}`}
          className="grid h-6 w-6 place-items-center rounded-full bg-strong text-[8.5px] font-semibold text-on-strong ring-2 ring-card"
        >
          {initials}
        </span>
      ))}
      {(members.length ?? 0) > 3 && (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-border text-[8.5px] font-semibold text-foreground ring-2 ring-card">
          +{(members.length ?? 0) - 3}
        </span>
      )}
    </div>
  );
}
