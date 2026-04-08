'use client';
import { useState } from 'react';
import AiAuditor from '@/components/AiAuditor';

export default function DashboardPage() {
  // Sample data - in your real app, this comes from Supabase
  const [shipments] = useState([
    { id: 'BOL-99234', description: 'Samsung Lithium Batteries from China', status: 'In Transit' },
    { id: 'BOL-88122', description: 'Electronic Components - BIS Certified', status: 'Pending Customs' }
  ]);
  
  const [selectedShipment, setSelectedShipment] = useState(shipments[0]);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white p-6">
        <h1 className="text-2xl font-bold mb-8 text-blue-400">Shipcore</h1>
        <nav className="space-y-4">
          <div className="text-sm font-medium text-slate-400 uppercase">Shipments</div>
          {shipments.map(s => (
            <button 
              key={s.id}
              onClick={() => setSelectedShipment(s)}
              className={`w-full text-left p-2 rounded ${selectedShipment.id === s.id ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
            >
              {s.id}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800">Shipment Details</h2>
            <p className="text-slate-500">Managing logistics for {selectedShipment.id}</p>
          </header>

          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
                <p className="font-semibold text-green-600">{selectedShipment.status}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Contents</label>
                <p className="font-semibold">{selectedShipment.description}</p>
              </div>
            </div>

            {/* --- NVIDIA NEMOTRON INTEGRATION --- */}
            <div className="mt-10 border-t pt-8">
              <AiAuditor 
                shipmentId={selectedShipment.id} 
                cargoDetails={selectedShipment.description} 
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}