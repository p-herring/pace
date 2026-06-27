function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Avatar({
  name,
  avatarUrl,
  size = 32,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  return (
    <span
      className="pace-avatar"
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      title={name}
    >
      {avatarUrl ? <img src={avatarUrl} alt="" /> : initials(name)}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 5,
}: {
  people: { name: string; avatarUrl?: string | null }[];
  max?: number;
}) {
  const shown = people.slice(0, max);
  const remaining = people.length - shown.length;
  return (
    <span className="pace-avatar-stack">
      {shown.map((person, index) => (
        <Avatar key={`${person.name}-${index}`} name={person.name} avatarUrl={person.avatarUrl} />
      ))}
      {remaining > 0 ? <span className="pace-avatar-more">+{remaining}</span> : null}
    </span>
  );
}
