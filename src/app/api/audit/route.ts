import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { shipmentId, cargoDetails } = await req.json();

    // Exchange Rate as of April 7, 2026
    const EXCHANGE_RATE = 92.87; 

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nemotron-mini',
        system: `You are the Shipcore Indian Customs Compliance & Duty Expert. 
                 All financial outputs MUST be in Indian Rupees (INR) using the symbol ₹.
                 Use the CBIC exchange rate: 1 USD = ${EXCHANGE_RATE} INR.
                 
                 Duty Calculation Logic (Budget 2026-27):
                 1. Assessable Value (AV) = CIF Value in USD converted to INR at ${EXCHANGE_RATE}.
                 2. Basic Customs Duty (BCD) = 5% of AV.
                 3. Social Welfare Surcharge (SWS) = 10% of BCD.
                 4. IGST = 18% of (AV + BCD + SWS).
                 5. Total Landed Cost = AV + BCD + SWS + IGST.`,
        prompt: `Perform an Indian Customs Audit and Duty Estimate:
                 Shipment ID: ${shipmentId}
                 Cargo: ${cargoDetails}
                 Value: Assume $10,000 USD if not specified.

                 Instructions:
                 - Provide a line-item breakdown of BCD, SWS, and IGST in ₹ (INR).
                 - Check for BIS IS 16046:2018 (Part 2) compliance for Indian ports.
                 - Verify if MeitY 'Standard Mark' and R-Number are required.
                 - Note that BCD is 5% for lithium-ion batteries per 2026 Budget.
                 - Mention if the shipment is eligible for AEO (Authorized Economic Operator) fast-track.`,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama connection failed: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({ report: data.response });

  } catch (error: any) {
    console.error("Audit API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}