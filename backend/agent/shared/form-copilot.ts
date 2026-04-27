/**
 * Shared form copilot for answering user questions about form fields
 */

import { IntentState } from "../state";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

/**
 * Answer user questions about form fields using LLM
 * Falls back to field description if LLM fails
 */
export async function answerFormQuestion(
  state: IntentState, 
  stepConfig: any
): Promise<string> {
  try {
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0.2,
    });
    
    const question = state.intent_plan?.clarification_question || 
                     state.intent_plan?.question_about || 
                     state.intent_plan?.usermessage || 
                     "Explain this form";
    
    // Build concise context about the current step
    const fieldNames = stepConfig?.form?.fields?.map((f: any) => f.label || f.name).join(", ") || "form fields";
    const stepDescription = stepConfig?.description || "";
    
    const sysMsg = new SystemMessage(`You are a helpful assistant answering questions about a form step.

Current Step: ${stepConfig?.title || "Form Step"}
${stepDescription ? `Description: ${stepDescription}` : ""}
Fields: ${fieldNames}

CRITICAL RULES:
1. Keep answers SHORT (1-2 sentences maximum)
2. Be direct and specific
3. Only answer what was asked
4. Don't explain the entire form unless asked
5. Use simple, clear language

Answer the user's question concisely.`);
    
    const humanMsg = new HumanMessage(question);
    const response = await llm.invoke([sysMsg, humanMsg]);
    
    return String(response.content);
  } catch (err) {
    console.error("Form copilot LLM failed, falling back to field description:", err);
    
    // Fallback: Try to find field description
    const questionAbout = state.intent_plan?.question_about || "";
    const field = stepConfig?.form?.fields?.find((f: any) => 
      f.label?.toLowerCase().includes(questionAbout.toLowerCase()) ||
      f.name?.toLowerCase().includes(questionAbout.toLowerCase())
    );
    
    if (field?.description) {
      return `**${field.label || field.name}**: ${field.description}`;
    }
    
    return `I can help you with that field. ${stepConfig?.description || "Please provide the required information."}`;
  }
}
