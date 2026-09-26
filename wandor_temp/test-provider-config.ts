import { strict as assert } from 'assert';
import { GeminiProvider } from './server/ai/gemini';
import { OpenAIProvider } from './server/ai/openai';
import { AnthropicProvider } from './server/ai/anthropic';

const gemini = new GeminiProvider();
const openai = new OpenAIProvider();
const anthropic = new AnthropicProvider();

assert.equal(gemini['primaryModel'], 'gemini-2.5-flash');
assert.equal(openai['model'], 'gpt-4o-mini');
assert.equal(anthropic['model'], 'claude-3-5-haiku-latest');

console.log('provider defaults test passed');
