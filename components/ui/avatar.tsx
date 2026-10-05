"use client";
import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { getInitials } from "@/lib/utils";
import type { Project, User } from "@/lib/types";

export function Avatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <BaseAvatar.Root
      className={`studio-avatar studio-avatar--${size}`}
      title={name}
      aria-label={name}
    >
      {src && (
        <BaseAvatar.Image
          src={src}
          alt=""
          className="h-full w-full object-cover"
        />
      )}
      <BaseAvatar.Fallback>{getInitials(name) || "?"}</BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
}

export function getProjectPeople(
  project: Project,
  people: User[],
): { id: string; name: string; avatar_url?: string | null }[] {
  const ids = Array.from(
    new Set(
      [
        project.leader_id,
        ...(project.project_members ?? []).map((member) => member.user_id),
      ].filter((id): id is string => Boolean(id)),
    ),
  );
  return ids.map((id) => {
    const person = people.find((person) => person.id === id);
    return {
      id,
      name: person?.name ?? "Team member",
      avatar_url: person?.avatar_url,
    };
  });
}

export function AvatarGroup({
  project,
  people,
  limit = 3,
}: {
  project: Project;
  people: User[];
  limit?: number;
}) {
  const members = getProjectPeople(project, people);
  if (!members.length) return <span className="studio-meta">Unassigned</span>;
  return (
    <div
      className="studio-avatar-group"
      aria-label={members.map((member) => member.name).join(", ")}
    >
      {members.slice(0, limit).map((member) => (
        <Avatar
          key={member.id}
          name={member.name}
          src={member.avatar_url}
          size="sm"
        />
      ))}
      {members.length > limit && (
        <span
          className="studio-avatar studio-avatar--sm studio-avatar-extra"
          title={members
            .slice(limit)
            .map((member) => member.name)
            .join(", ")}
        >
          +{members.length - limit}
        </span>
      )}
    </div>
  );
}
