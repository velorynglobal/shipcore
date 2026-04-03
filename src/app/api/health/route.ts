import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'ShipCore ERP - Veloryn Global Logistics',
    modules: {
      authentication: 'active',
      jobs: 'active',
      consol: 'active',
      customers: 'active',
      agents: 'active',
      invoices: 'active',
      documents: 'active',
      dashboard: 'active',
    },
    uptime: Math.round(process.uptime()),
    environment: process.env.NODE_ENV,
    region: process.env.VERCEL_REGION || 'local',
  }, { status: 200 })
}
