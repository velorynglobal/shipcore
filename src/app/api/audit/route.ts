import { NextResponse } from 'next/server';

const EXCHANGE_RATE = 92.87; // CBIC rate

export async function POST(req: Request) {
  try {
    const { shipmentId, cargoDetails } = await req.json();
    if (!shipmentId || !cargoDetails) {
      return NextResponse.json({ error: 'shipmentId and cargoDetails are required' }, { status: 400 });
    }

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_KEY) {
      // Return mock analysis if no API key configured
      return NextResponse.json({
        analysis: `Customs Duty Analysis for Shipment ${shipmentId}\n\nCargo: ${cargoDetails}\n\nNote: Configure ANTHROPIC_API_KEY in environment variables for AI-powered duty analysis.\n\nManual calculation required based on HS code and CBIC rates.\nExchange Rate: 1 USD = ₹${EXCHANGE_RATE}`,
        exchange_rate: EXCHANGE_RATE,
      });
    }

    const prompt = `You are a ShipCore Indian Customs Compliance & Duty Expert.
All financial outputs MUST be in Indian Rupees (INR) using the symbol ₹.
Use the CBIC exchange rate: 1 USD = ${EXCHANGE_RATE} INR.

Duty Calculation Logic (Budget 2026-27):
1. Assessable Value (AV) = CIF Value in USD converted to INR at ${EXCHANGE_RATE}
2. Basic Customs Duty (BCD) = AV × BCD Rate
3. Social Welfare Surcharge (SWS) = BCD × 10%
4. IGST Base = AV + BCD + SWS
5. IGST = IGST Base × IGST Rate
6. Total Duty = BCD + SWS + IGST

Shipment ID: ${shipmentId}
Cargo Details: ${cargoDetails}

Provide a structured customs duty analysis with HS code suggestion, applicable rates, and total duty calculation in INR.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const analysis = data.content?.[0]?.text || 'Analysis unavailable';

    return NextResponse.json({ analysis, exchange_rate: EXCHANGE_RATE });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
