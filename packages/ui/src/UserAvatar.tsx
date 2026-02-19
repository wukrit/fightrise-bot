import React, { useState } from 'react';

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

function DefaultAvatar({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const pixels = sizeMap[size];

  return (
    <div
      style={{
        width: pixels,
        height: pixels,
        borderRadius: '50%',
        backgroundColor: '#6366f1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: pixels * 0.5,
        fontWeight: 600,
      }}
    >
      <svg
        width={pixels * 0.6}
        height={pixels * 0.6}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
}

export function UserAvatar({ src, alt, size = 'md' }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pixels = sizeMap[size];

  const handleError = () => {
    setImgError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (imgError || !src) {
    return <DefaultAvatar size={size} />;
  }

  return (
    <div style={{ position: 'relative', width: pixels, height: pixels }}>
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            backgroundColor: '#e5e7eb',
          }}
        />
      )}
      <img
        src={src}
        alt={alt}
        width={pixels}
        height={pixels}
        onError={handleError}
        onLoad={handleLoad}
        style={{
          borderRadius: '50%',
          objectFit: 'cover',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.2s ease',
        }}
      />
    </div>
  );
}
