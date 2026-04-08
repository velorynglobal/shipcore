'use client';
import { useState } from 'react';
import { Button, Input, Card } from './ui';
import { ShieldAlert, IndianRupee, Calculator } from 'lucide-react';

interface AiAuditorProps {
  shipmentId: string;
  cargoDetails: string;
}

export default function AiAuditor({ shipmentId, cargoDetails }: AiAuditorProps) {
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [usdValue, setUsdValue] = useState("");

  const runAudit = async () => {
    setLoading(true);
    setReport(""); // Clear previous report
    
    try {
      // We append the user-provided value to the cargo details string
      const enhancedDetails = usdValue 
        ? `${cargoDetails}. The declared CIF value is $${usdValue} USD.` 
        : cargoDetails;

      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          shipmentId, 
          cargoDetails: enhancedDetails 
        }),
      });

      if (!res.ok) throw new Error("Failed to reach local AI server.");

      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      setReport("Error: Ensure Ollama is running 'nemotron-mini' on your local machine.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-0 overflow-hidden border-blue-200 shadow-lg">
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-brand-500 p-1.5 rounded-lg">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">NVIDIA Nemotron Auditor</h3>
            <p className="text-slate-400 text-[10px] font-mono uppercase tracking-wider">Indian Customs Compliance v2026</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400 text-[10px] font-bold">LOCAL GPU ACTIVE</span>
        </div>
      </div>

      <div className="p-6 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Input 
            label="Shipment Value (USD)" 
            placeholder="e.g. 12500" 
            value={usdValue}
            onChange={(e) => setUsdValue(e.target.value)}
            leftIcon={<span className="text-xs font-bold text-slate-400">$</span>}
          />
          <div className="flex items-end">
            <Button 
              onClick={runAudit} 
              loading={loading}
              className="w-full"
              icon={<Calculator className="w-4 h-4" />}
            >
              {report ? "Run New Audit" : "Analyze Shipment"}
            </Button>
          </div>
        </div>

        {report && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 mb-3 text-brand-600 font-bold text-xs uppercase tracking-widest">
              <IndianRupee className="w-4 h-4" />
              Compliance & Duty Report
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {report}
            </div>
            <p className="mt-4 text-[10px] text-slate-400 italic">
              * Calculations based on CBIC 2026 exchange rates and Union Budget 2026-27 duty slabs.
            </p>
          </div>
        )}

        {!report && !loading && (
          <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
            <p className="text-slate-400 text-sm">Enter a value and click Analyze to generate an Indian Customs report.</p>
          </div>
        )}
      </div>
    </Card>
  );
}