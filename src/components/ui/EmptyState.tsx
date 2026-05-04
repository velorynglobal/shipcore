"use client";
import React, { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      textAlign: 'center' as any,
    }}>
      {icon && <div style={{ marginBottom: 16, opacity: 0.5 }}>{icon}</div>}
      <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 400, marginBottom: action ? 20 : 0 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
