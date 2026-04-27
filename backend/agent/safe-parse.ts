/**
 * Safe JSON parsing utility with error handling
 * 
 * Prevents uncaught exceptions when LLM returns malformed JSON.
 * Falls back to null on parse failure, allowing graceful degradation.
 */
export function safeJsonParse(text: string, context: string): any | null {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`❌ JSON parse failed in ${context}:`, text.substring(0, 200));
    return null;
  }
}
