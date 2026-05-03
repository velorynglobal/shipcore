import type { AiRouterOptions } from '../router';

export interface ContainerTrackingInput {
  container_number: string;
  container_type: '20GP' | '40GP' | '40HC' | '45HC';
  current_location?: string;
  destination?: string;
  expected_arrival?: string;
}

export interface ContainerTrackingOutput {
  container_number: string;
  current_status: string;
  current_location: string;
  destination: string;
  expected_arrival: string;
  days_in_transit: number;
  alerts: string[];
  recommendations: string[];
  confidence: number;
}

export async function trackContainer(input: ContainerTrackingInput): Promise<ContainerTrackingOutput> {
  const prompt = `You are a container tracking specialist.
  
Given:
- Container: ${input.container_number} (${input.container_type})
- Current Location: ${input.current_location || 'Unknown'}
- Destination: ${input.destination || 'Unknown'}
- Expected Arrival: ${input.expected_arrival || 'Unknown'}

Analyze and return JSON: {
  "container_number": "...",
  "current_status": "In Transit|At Port|Customs Clearance|Delivered",
  "current_location": "Port name, Country",
  "destination": "Port name, Country",
  "expected_arrival": "YYYY-MM-DD",
  "days_in_transit": number,
  "alerts": ["..."],
  "recommendations": ["..."],
  "confidence": 0.0-1.0
}`;

  const options: AiRouterOptions = {
    instruction: prompt,
    context: { skill: 'container-tracking', ...input },
    modelHint: 'claude', // Claude is good at logistics analysis
  };

  // This would call the AI Router - for now return mock
  return {
    container_number: input.container_number,
    current_status: 'In Transit',
    current_location: input.current_location || 'Singapore Port',
    destination: input.destination || 'Nhava Sheva, India',
    expected_arrival: input.expected_arrival || '2026-05-15',
    days_in_transit: 12,
    alerts: ['Monsoon season may delay port operations'],
    recommendations: ['Consider expedited customs clearance', 'Monitor daily updates'],
    confidence: 0.9,
  };
}
