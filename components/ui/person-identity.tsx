import { getInitials } from "@/lib/utils";

export function PersonIdentity({ name, label = "Assigned to" }: { name?: string; label?: string }) {
  const displayName = name || "Unassigned";
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-strong text-xs font-semibold text-on-strong">
        {getInitials(displayName)}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="person-identity-name text-base font-semibold leading-normal text-foreground">{displayName}</p>
      </div>
    </div>
  );
}
