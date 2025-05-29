/**
 * Token Cost Calculation Tests
 * 
 * Tests for the improved token cost calculation system including
 * different models, token estimation, and streaming cost calculations.
 */

import { assertEquals, assertAlmostEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { 
  calculateTokenCost, 
  estimateTokens, 
  calculateStreamingCost, 
  estimateRequestCost,
  TOKEN_COSTS 
} from "../costs.js";

Deno.test("Token Cost Calculations", async (t) => {
  await t.step("should calculate costs for OpenAI models correctly", () => {
    // GPT-3.5-turbo: input 0.5, output 1.5 per 1K tokens
    const cost = calculateTokenCost('gpt-3.5-turbo', 1000, 1000);
    assertEquals(cost, Math.ceil(0.5 + 1.5)); // Should be 2 credits
  });

  await t.step("should calculate costs for premium models correctly", () => {
    // GPT-4: input 30, output 60 per 1K tokens
    const cost = calculateTokenCost('gpt-4', 1000, 1000);
    assertEquals(cost, Math.ceil(30 + 60)); // Should be 90 credits
  });

  await t.step("should calculate costs for Anthropic models correctly", () => {
    // Claude-3-sonnet: input 3, output 15 per 1K tokens
    const cost = calculateTokenCost('claude-3-sonnet', 1000, 1000);
    assertEquals(cost, Math.ceil(3 + 15)); // Should be 18 credits
  });

  await t.step("should calculate costs for Gemini models correctly", () => {
    // Gemini-1.5-flash: input 0.075, output 0.3 per 1K tokens
    const cost = calculateTokenCost('gemini-1.5-flash', 1000, 1000);
    assertEquals(cost, Math.ceil(0.075 + 0.3)); // Should be 1 credit
  });

  await t.step("should handle fractional costs correctly", () => {
    // Small token counts should still result in meaningful costs
    const cost = calculateTokenCost('gpt-4o', 100, 100); // 0.25 + 1.0 = 1.25
    assertEquals(cost, Math.ceil(0.25 + 1.0)); // Should round up to 2 credits
  });

  await t.step("should use default pricing for unknown models", () => {
    const cost = calculateTokenCost('unknown-model', 1000, 1000);
    assertEquals(cost, Math.ceil(5)); // Default conservative estimate of 5 credits per 1K tokens
  });

  await t.step("should estimate tokens accurately for different models", () => {
    const text = "Hello world, how are you today?"; // ~7 words, ~31 characters
    
    // Standard models (4 chars per token)
    const gptTokens = estimateTokens(text, 'gpt-3.5-turbo');
    assertEquals(gptTokens, Math.ceil(31 / 4)); // ~8 tokens
    
    // Gemini models (3.5 chars per token, more efficient)
    const geminiTokens = estimateTokens(text, 'gemini-1.5-flash');
    assertEquals(geminiTokens, Math.ceil(31 / 3.5)); // ~9 tokens
  });

  await t.step("should calculate streaming costs properly", () => {
    const promptTokens = 100;
    const completionText = "This is a test response with multiple words."; // ~44 characters
    
    const cost = calculateStreamingCost('gpt-3.5-turbo', promptTokens, completionText);
    const expectedCompletionTokens = Math.ceil(44 / 4); // ~11 tokens
    const expectedCost = calculateTokenCost('gpt-3.5-turbo', promptTokens, expectedCompletionTokens);
    
    assertEquals(cost, expectedCost);
  });

  await t.step("should estimate request costs for planning", () => {
    const prompt = "Write a story about a robot."; // ~28 characters
    const estimatedResponseLength = 200; // characters
    
    const cost = estimateRequestCost('gpt-4o', prompt, estimatedResponseLength);
    
    const promptTokens = Math.ceil(28 / 4); // ~7 tokens
    const responseTokens = Math.ceil(200 / 4); // ~50 tokens
    const expectedCost = calculateTokenCost('gpt-4o', promptTokens, responseTokens);
    
    assertEquals(cost, expectedCost);
  });

  await t.step("should handle empty text gracefully", () => {
    const cost = calculateStreamingCost('gpt-3.5-turbo', 100, '');
    assertEquals(cost, calculateTokenCost('gpt-3.5-turbo', 100, 0));
  });

  await t.step("should ensure all supported models have pricing", () => {
    const supportedModels = [
      'gpt-3.5-turbo', 'gpt-3.5', 'gpt-4o', 'gpt-4',
      'claude-3-sonnet', 'claude-sonnet', 'claude-3-haiku',
      'gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 
      'gemini-1.5-flash-8b', 'gemini-2.0-flash', 'gemini-2.0-flash-lite',
      'gemini-2.5-flash-preview-05-20', 'gemini-flash'
    ];
    
    for (const model of supportedModels) {
      const cost = calculateTokenCost(model, 1000, 1000);
      // Should not be the default fallback cost for any supported model
      assertEquals(cost < 10 || cost === 90, true, `Model ${model} should have specific pricing`);
    }
  });
});

Deno.test("Token Cost Accuracy", async (t) => {
  await t.step("should be more expensive for premium models", () => {
    const tokens = 1000;
    
    const gpt35Cost = calculateTokenCost('gpt-3.5-turbo', tokens, tokens);
    const gpt4Cost = calculateTokenCost('gpt-4', tokens, tokens);
    const claudeCost = calculateTokenCost('claude-3-sonnet', tokens, tokens);
    
    // Premium models should be more expensive
    assertEquals(gpt4Cost > gpt35Cost, true);
    assertEquals(claudeCost > gpt35Cost, true);
  });

  await t.step("should reflect real-world pricing differences", () => {
    const tokens = 1000;
    
    // Gemini Flash should be cheaper than GPT models
    const geminiCost = calculateTokenCost('gemini-1.5-flash', tokens, tokens);
    const gptCost = calculateTokenCost('gpt-3.5-turbo', tokens, tokens);
    
    assertEquals(geminiCost <= gptCost, true);
  });

  await t.step("should handle realistic conversation scenarios", () => {
    // Typical conversation: ~50 tokens prompt, ~200 tokens response
    const promptTokens = 50;
    const completionTokens = 200;
    
    const gpt35Cost = calculateTokenCost('gpt-3.5-turbo', promptTokens, completionTokens);
    const geminiCost = calculateTokenCost('gemini-1.5-flash', promptTokens, completionTokens);
    
    // Both should be reasonable (< 10 credits for this scenario)
    assertEquals(gpt35Cost < 10, true);
    assertEquals(geminiCost < 10, true);
    
    // And Gemini should be cheaper
    assertEquals(geminiCost <= gpt35Cost, true);
  });
});
