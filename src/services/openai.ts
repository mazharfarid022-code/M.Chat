import OpenAI from 'openai';

export async function generateChatResponse(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  apiKey: string,
  model: string = 'gpt-4o-mini'
) {
  if (!apiKey) {
    throw new Error('OpenAI API Key is missing. Please add it in Settings.');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });

  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      stream: true,
    });
    return response;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

export async function generateImage(prompt: string, apiKey: string) {
  if (!apiKey) {
    throw new Error('OpenAI API Key is missing. Please add it in Settings.');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
    });
    return response.data[0].url;
  } catch (error) {
    console.error('OpenAI Image Error:', error);
    throw error;
  }
}
