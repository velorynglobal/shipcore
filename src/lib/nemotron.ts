// Nemotron-style AI analysis using Anthropic Claude API
export async function askNemotron(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return 'AI analysis unavailable. Configure ANTHROPIC_API_KEY to enable.';
  }
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    return data.content?.[0]?.text || 'No response from AI';
  } catch (error) {
    console.error('AI Connection Error:', error);
    return 'AI analysis currently unavailable.';
  }
}
