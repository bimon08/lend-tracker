'use client';

import Avatar, { genConfig } from 'react-nice-avatar';

interface UserAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export default function UserAvatar({ name, size = 42, className = '' }: UserAvatarProps) {
  const config = genConfig(name);

  return (
    <div className={`shrink-0 ${className}`}>
      <Avatar
        style={{ width: `${size}px`, height: `${size}px` }}
        {...config}
      />
    </div>
  );
}
