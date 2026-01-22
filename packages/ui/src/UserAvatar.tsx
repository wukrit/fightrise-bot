import React from 'react';

export interface UserAvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 48,
};

export function UserAvatar({ src, alt, size = 'md' }: UserAvatarProps) {
  const pixels = sizeMap[size];

  return (
    <img
      src={src}
      alt={alt}
      width={pixels}
      height={pixels}
      style={{
        borderRadius: '50%',
        objectFit: 'cover',
      }}
    />
  );
}
