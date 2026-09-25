interface TeamAvatarStackProps {
  members: string[];
}

export function TeamAvatarStack({ members }: TeamAvatarStackProps) {
  return (
    <div className="flex -space-x-1 overflow-hidden">
      {members.slice(0, 3).map((initials, idx) => (
        <span
          key={`${initials}-${idx}`}
          className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-[8.5px] font-black text-white ring-2 ring-white"
        >
          {initials}
        </span>
      ))}
      {(members.length ?? 0) > 3 && (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-[8.5px] font-black text-slate-700 ring-2 ring-white">
          +{(members.length ?? 0) - 3}
        </span>
      )}
    </div>
  );
}
