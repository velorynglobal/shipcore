"use client";
import React, { useState, useEffect } from 'react';

interface MarketplaceAgent {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  rating: number;
  installs: number;
  tags: string[];
  installed: boolean;
}

export default function MarketplacePage() {
  const [agents, setAgents] = useState<MarketplaceAgent[]>([);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch('/api/marketplace');
        const data = await res.json();
        setAgents(data.agents || []);
      } catch (err) {
        console.error('Failed to load marketplace:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAgents();
  }, []);

  async function handleInstall(agentId: string) {
    setInstalling(agentId);
    try {
      const res = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId }),
      });
      if (res.ok) {
        setAgents(prev => 
          prev.map(a => a.id === agentId ? { ...a, installed: true } : a)
        );
      }
    } catch (err) {
      console.error('Install failed:', err);
    } finally {
      setInstalling(null);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 18, color: '#6b7280' }}>Loading marketplace...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Agent Marketplace</h1>
      <p style={{ color: '#6b7280', marginBottom: 32 }}>
        Install third-party agents to extend ShipCore's AI capabilities.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
        {agents.map(agent => (
          <div key={agent.id} style={{
            background: 'white',
            padding: 24,
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{agent.name}</h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
              {agent.description}
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {agent.tags.map(tag => (
                <span key={tag} style={{
                  background: '#e0e7ff',
                  color: '#3730fa',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 500,
                }}>
                  {tag}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, color: '#6b7280' }}>
                <span>⭐ {agent.rating}</span>
                <span style={{ marginLeft: 16 }}>Installs: {agent.installs}</span>
              </div>
              <button
                onClick={() => handleInstall(agent.id)}
                disabled={agent.installed || installing === agent.id}
                style={{
                  padding: '8px 16px',
                  background: agent.installed ? '#d1d5db' : '#1e40af',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: agent.installed ? 'not-allowed' : 'pointer',
                  opacity: installing === agent.id ? 0.7 : 1,
                }}>
                {installing === agent.id ? 'Installing...' : agent.installed ? 'Installed' : 'Install'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
