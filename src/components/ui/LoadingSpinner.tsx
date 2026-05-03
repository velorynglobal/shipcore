"use client";
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export default function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: 40,
      gap: 12,
    }}>
      <div style={{
        width: sizeMap[size],
        height: sizeMap[size],
        border: '2px solid #e5e7eb',
        borderTopColor: '#1e40af',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      {text && <p style={{ color: '#6b7280', fontSize: 14 }}>{text}</p>}
    </div>
  );
}
