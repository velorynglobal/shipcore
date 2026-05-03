"use client";
import React from 'react';
import InviteUserForm from '@/app/components/InviteUserForm';

export default function InvitePage() {
  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
        User Invites
      </h1>
      <p style={{ color: '#666', marginBottom: 32 }}>
        Invite team members to your ShipCore workspace. They will receive an email with a link to set up their account.
      </p>
      
      <div style={{ 
        background: 'white', 
        padding: 32, 
        borderRadius: 12, 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 24 }}>
          Send New Invitation
        </h2>
        <InviteUserForm />
      </div>

      <div style={{ marginTop: 32, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Roles Explained:</h3>
        <ul style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>
          <li><strong>Admin:</strong> Full access to all features, can manage users and company settings</li>
          <li><strong>Operator:</strong> Can create and manage jobs, invoices, and day-to-day operations</li>
          <li><strong>Viewer:</strong> Read-only access to view data and reports</li>
        </ul>
      </div>
    </div>
  );
}
