import type { AiRouterOptions } from '../router';

export interface RoutePlanningInput {
  origin_port: string;
  destination_port: string;
  container_type: '20GP' | '40GP' | '40HC' | '45HC';
  weight: number;
  cbm: number;
  commodity?: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface RoutePlanningOutput {
  recommended_route: {
    vessel: string;
    carrier: string;
    transit_days: number;
    cost_usd: number;
    reliability_score: number;
  };
  alternatives: {
    vessel: string;
    carrier: string;
    transit_days: number;
    cost_usd: number;
  }[];
  confidence: number;
  warnings: string[];
}

export async function planRoute(input: RoutePlanningInput): Promise<RoutePlanningOutput> {
  const prompt = `You are a maritime route planning specialist.
  
Given:
- Origin: ${input.origin_port}
- Destination: ${input.destination_port}
- Container: ${input.container_type}
- Weight: ${input.weight}kg, CBM: ${input.cbm}
- Commodity: ${input.commodity || 'General'}
- Urgency: ${input.urgency}

Return JSON: {
  "recommended_route": {
    "vessel": "Vessel name",
    "carrier": "Carrier name",
    "transit_days": number,
    "cost_usd": number,
    "reliability_score": 0.0-1.0
  },
  "alternatives": [...],
  "confidence": 0.0-1.0,
  "warnings": ["..."]
}`;

  const options: AiRouterOptions = {
    instruction: prompt,
    context: { skill: 'route-planning', ...input },
    modelHint: 'gpt', // GPT models good at planning
  };

  // This would call the AI Router - for now return mock
  return {
    recommended_route: {
      vessel: 'MV Pacific Star',
      carrier: 'Maersk Line',
      transit_days: 18,
      cost_usd: 3200,
      reliability_score: 0.92,
    },
    alternatives: [
      { vessel: 'MV Ever Green', carrier: 'Evergreen', transit_days: 16, cost_usd: 3100 },
    ],
    confidence: 0.88,
    warnings: ['Monsoon season may affect transit times'],
  };
}
