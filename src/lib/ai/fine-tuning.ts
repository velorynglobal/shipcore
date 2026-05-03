import fs from 'fs';
import path from 'path';

export interface FineTuningJob {
  id?: string;
  model: string; // Base model to fine-tune
  training_file: string; // Path to training data
  validation_file?: string; // Optional validation data
  hyperparameters?: {
    n_epochs?: number;
    learning_rate_multiplier?: number;
    batch_size?: number;
  };
  status?: 'pending' | 'running' | 'succeeded' | 'failed';
  created_at?: string;
  finished_at?: string;
}

export interface TrainingExample {
  instruction: string;
  input?: string;
  output: string;
  context?: Record<string, any>;
}

export async function prepareTrainingData(
  examples: TrainingExample[],
  outputPath: string
): Promise<void> {
  const formattedData = examples.map(ex => ({
    messages: [
      { role: 'system', content: 'You are a logistics AI specialist for ShipCore ERP.' },
      { role: 'user', content: ex.input ? `${ex.instruction}\n\nContext: ${JSON.stringify(ex.context || {})}` : ex.instruction },
      { role: 'assistant', content: ex.output },
    ]
  }));

  const jsonlContent = formattedData.map(item => JSON.stringify(item)).join('\n');
  await fs.promises.writeFile(outputPath, jsonlContent, 'utf8');
}

export function loadTrainingData(filePath: string): TrainingExample[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  
  return lines.map(line => {
    const parsed = JSON.parse(line);
    const userMsg = parsed.messages.find((m: any) => m.role === 'user');
    const assistantMsg = parsed.messages.find((m: any) => m.role === 'assistant');
    
    return {
      instruction: userMsg?.content?.split('\n')[0] || '',
      input: userMsg?.content?.split('\n\nContext:')[1] || undefined,
      output: assistantMsg?.content || '',
      context: JSON.parse(userMsg?.content?.match(/Context: ({.*})/)?.[1] || '{}'),
    };
  });
}

// Sample logistics training examples
export const sampleLogisticsData: TrainingExample[] = [
  {
    instruction: 'Extract logistics job details from text',
    input: 'Shipment of 500 cartons of electronics from Shanghai to Mumbai via Maersk Line vessel MV Pacific Star',
    output: JSON.stringify({
      job_type: 'IMP',
      pol: 'CNSHA',
      pod: 'INMUN',
      carrier: 'Maersk Line',
      vessel: 'MV Pacific Star',
      packages: 500,
      commodity: 'Electronics',
    }),
    context: { source: 'email', customer: 'ACME Corp' },
  },
  {
    instruction: 'Generate invoice line items for freight forwarding',
    input: 'FCL shipment from Shanghai to Mumbai, 500 cartons, weight 8500kg, CBM 45',
    output: JSON.stringify([
      { description: 'Ocean Freight', quantity: 1, unit: 'shipment', rate: 3200, amount: 3200 },
      { description: 'Documentation Fee', quantity: 1, unit: 'lot', rate: 150, amount: 150 },
      { description: 'Handling Charges', quantity: 1, unit: 'lot', rate: 250, amount: 250 },
      { description: 'CGST @9%', quantity: 1, unit: 'lot', rate: 319.5, amount: 319.5 },
      { description: 'SGST @9%', quantity: 1, unit: 'lot', rate: 319.5, amount: 319.5 },
    ]),
    context: { invoice_type: 'sales', container_type: '40HC' },
  },
  {
    instruction: 'Analyze customs clearance requirements',
    input: 'Import of electronics from China to India, HSN Code 8542, CIF Value $75,000',
    output: JSON.stringify({
      hsn_code: '8542',
      duty_rate: 10,
      igst_rate: 18,
      estimated_duty: 7500,
      clearance_time: '3-5 days',
      documents_required: ['Bill of Entry', 'Commercial Invoice', 'Packing List', 'HSN Declaration'],
    }),
    context: { country: 'India', commodity: 'Electronics' },
  },
];

export async function saveSampleData(): Promise<string> {
  const dataDir = 'fine-tuning-data';
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const filePath = path.join(dataDir, 'logistics-training.jsonl');
  await prepareTrainingData(sampleLogisticsData, filePath);
  return filePath;
}
