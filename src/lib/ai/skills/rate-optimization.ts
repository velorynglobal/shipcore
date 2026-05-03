import type { AiRouterOptions } from '../router';

export interface RateOptimizationInput {
  origin: string;
  destination: string;
  container_type: '20GP' | '40GP' | '40HC' | '45HC';
  weight: number;
  cbm: number;
  commodity?: string;
}

export interface RateOptimizationOutput {
  recommended_rate: number;
  carrier: string;
  transit_time: string;
  confidence: number;
  warnings: string[];
}

export async function optimizeRate(input: RateOptimizationInput): Promise<RateOptimizationOutput> {
  const prompt = `You are a logistics rate optimization specialist.
  
Given:
- Origin: ${input.origin}
- Destination: ${input.destination}
- Container: ${input.container_type}
- Weight: ${input.weight}kg
- CBM: ${input.cbm}
- Commodity: ${input.commodity || 'General'}

Return JSON: {
  "recommended_rate": number (USD),
  "carrier": "carrier name",
  "transit_time": "X-Y days",
  "confidence": 0.0-1.0,
  "warnings": ["..."]
}`;

  const options: AiRouterOptions = {
    instruction: prompt,
    context: { skill: 'rate-optimization', ...input },
    modelHint: 'gpt', // GPT models are good at numerical tasks
  };

  // This would call the AI Router - for now return mock
  return {
    recommended_rate: 2500,
    carrier: 'Maersk',
    transit_time: '18-22 days',
    confidence: 0.85,
    warnings: ['Rate valid for 30 days', 'Subject to fuel surcharge'],
  };
}
