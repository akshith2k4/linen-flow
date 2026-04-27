"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { DynamicForm } from "@/components/forms/dynamic-form";
import { Loader2, Zap, Code2, Eye } from "lucide-react";

interface FormSchema {
  form: {
    title?: string;
    description?: string;
    fields: any[];
    submit?: { label: string };
  };
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  form?: FormSchema | null;
  isFormSubmitted?: boolean;
  isLocked?: boolean;
  thread_id?: string;
  widget_id?: string; // Track which widget this message represents
  summaryData?: {
    title?: string;
    items: { label: string; value: string }[];
  }[];
  quickActions?: Array<{
    label: string;
    action: string;
  }>;
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Listen for custom events from entity list (radio button clicks)
  useEffect(() => {
    const handleCustomMessage = (event: any) => {
      const message = event.detail?.message;
      if (message) {
        handleSendMessage(message);
      }
    };

    window.addEventListener('sendChatMessage', handleCustomMessage);
    return () => {
      window.removeEventListener('sendChatMessage', handleCustomMessage);
    };
  }, [messages, isLoading]); // Include dependencies for handleSendMessage

  const onFormComplete = (data: any, formData: any, schema: any) => {
    const isApiStep = schema?.form?.submit?.label?.toLowerCase().includes("save");
    const isWorkflowComplete = data.workflow_result?.selected_workflow === null;
    const lockEverything = isApiStep || isWorkflowComplete;

    setMessages((prev) => {
      const newMessages = prev.map((m) => ({
        ...m,
        isFormSubmitted: true,
        isLocked: m.isLocked || lockEverything
      }));

      let summaryData: { title?: string; items: { label: string; value: string }[] }[] | undefined;

      if (formData) {
        summaryData = [];
        const getLabel = (key: string) => {
          const field = schema?.form?.fields?.find((f: any) => f.name === key);
          if (field && field.label) return field.label.replace(/\*/g, '').trim();

          const cleanKey = key.split('.').pop() || key;
          return cleanKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
        };

        if (Array.isArray(formData)) {
          formData.forEach((entry, i) => {
            const title = `${schema?.form?.add_label ? schema.form.add_label.replace('Add ', '') : 'Entry'} ${i + 1}`;
            const items = Object.entries(entry).map(([k, v]) => ({
              label: getLabel(k),
              value: String(v)
            }));
            summaryData!.push({ title, items });
          });
        } else if (typeof formData === 'object') {
          const items = Object.entries(formData).map(([k, v]) => ({
            label: getLabel(k),
            value: String(v)
          }));
          summaryData.push({ items });
        }
      }

      if (summaryData && summaryData.length > 0) {
        newMessages.push({
          id: crypto.randomUUID(),
          sender: "user",
          text: "Submitted form details",
          summaryData,
          isFormSubmitted: true,
          isLocked: lockEverything
        });
      }

      newMessages.push({
        id: crypto.randomUUID(),
        sender: "bot",
        text: data.workflow_result?.message || "Next step ready.",
        form: data.form_schema || null,
        thread_id: data.thread_id,
        isFormSubmitted: false,
        isLocked: false,
        // Only show quickActions when workflow is complete (no form and no active workflow)
        quickActions: (!data.form_schema && !data.workflow_result?.selected_workflow) 
          ? data.workflow_result?.quick_actions || undefined 
          : undefined,
      });

      return newMessages;
    });
  };

  const handleSendMessage = async (input: string) => {
    if (!input.trim() || isLoading) return;

    if (!showChat) setShowChat(true);

    const latestBotMessage = [...messages].reverse().find(m => m.sender === "bot" && m.thread_id);
    const existingThreadId = latestBotMessage?.thread_id;

    // Add user message to chat
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: input,
      isFormSubmitted: false,
      isLocked: false
    };
      
    setMessages((prev) => [...prev, userMsg]);
    
    setIsLoading(true);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    try {
      const response = await axios.post(`${backendUrl}/api/chat`, {
        message: input,
        thread_id: existingThreadId
      });

      const data = response.data;
      
      // Check if this is a pagination update (has widget_id)
      const widgetId = data.workflow_result?.widget_id;
      
      // For structured responses with ui_data, pass the entire ui_data as text
      // This allows MessageContent to parse and render search buttons, widgets, etc.
      const messageText = data.workflow_result?.ui_data 
        ? JSON.stringify(data.workflow_result.ui_data)
        : (data.workflow_result?.message || "Processing...");
      
      // Check if a workflow is now active (backend sends entity_context.active_workflow)
      const hasActiveWorkflow = data.entity_context?.active_workflow !== null && 
                                data.entity_context?.active_workflow !== undefined;
      
      if (widgetId) {
        // Find and replace the existing message with the same widget_id
        setMessages((prev) => {
          const existingIndex = prev.findIndex(m => m.widget_id === widgetId);
          
          if (existingIndex !== -1) {
            // Replace the existing message
            const newMessages = [...prev];
            newMessages[existingIndex] = {
              ...newMessages[existingIndex],
              text: messageText,
              form: data.form_schema || null,
              thread_id: data.thread_id,
              // Only show quickActions when workflow is complete (no form and no active workflow)
              quickActions: (!data.form_schema && !data.workflow_result?.selected_workflow) 
                ? data.workflow_result?.quick_actions || undefined 
                : undefined,
            };
            return newMessages;
          } else {
            // First time showing this widget, add it normally
            return [
              ...prev,
              {
                id: crypto.randomUUID(),
                sender: "bot",
                text: messageText,
                form: data.form_schema || null,
                thread_id: data.thread_id,
                widget_id: widgetId,
                isFormSubmitted: false,
                isLocked: false,
                // Only show quickActions when workflow is complete (no form and no active workflow)
                quickActions: (!data.form_schema && !data.workflow_result?.selected_workflow) 
                  ? data.workflow_result?.quick_actions || undefined 
                  : undefined,
              }
            ];
          }
        });
      } else {
        // Normal message (no widget_id), add as new message
        setMessages((prev) => {
          // If a workflow is now active, hide previous chatnode widgets (stale responses)
          // This prevents hotel details cards from appearing above workflow forms
          const filteredMessages = hasActiveWorkflow 
            ? prev.filter(m => {
                // Keep all user messages for context
                if (m.sender === "user") return true;
                // Keep bot messages that have forms (workflow messages)
                if (m.form) return true;
                // Remove bot messages with widget_id (stale chatnode widgets like hotel_details)
                if (m.widget_id) return false;
                // Keep other bot messages (plain text responses)
                return true;
              })
            : prev;
          
          return [
            ...filteredMessages,
            {
              id: crypto.randomUUID(),
              sender: "bot",
              text: messageText,
              form: data.form_schema || null,
              thread_id: data.thread_id,
              isFormSubmitted: false,
              isLocked: false,
              // Only show quickActions when workflow is complete (no form and no active workflow)
              quickActions: (!data.form_schema && !data.workflow_result?.selected_workflow) 
                ? data.workflow_result?.quick_actions || undefined 
                : undefined,
            }
          ];
        });
      }
    } catch (error) {
      console.error("Request error:", error);
      setMessages((prev) => [
        ...prev,
        { 
          id: crypto.randomUUID(), 
          sender: "bot", 
          text: "Connection error. Please check if the server is running.",
          isFormSubmitted: false,
          isLocked: false
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: string) => {
    setShowChat(true);
    handleSendMessage(action);
  };

  return (
    <div className="flex h-screen bg-white">
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-hidden flex flex-col relative">
          {!showChat ? (
            <div className="flex-1 flex flex-col items-center px-4 pt-28 pb-40 bg-gradient-to-b from-gray-50/50 via-white to-[#2e7d32]/5">
              {/* Flash AI Branding */}
              <div className="flex items-center gap-3 mb-14">
                <div className="relative group">
                  <div className="absolute inset-0 bg-[#2e7d32]/30 rounded-2xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                  <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#2e7d32] via-[#2e7d32] to-[#1b5e20] flex items-center justify-center shadow-xl shadow-[#2e7d32]/30 group-hover:shadow-[#2e7d32]/40 transition-all duration-300">
                    <Zap size={24} className="text-white" fill="white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tighter font-[family-name:var(--font-display)]">FLASH AI</h2>
                  <p className="text-[10px] text-[#2e7d32] font-semibold uppercase tracking-[0.2em] font-[family-name:var(--font-mono)]">Kinetic Sanctuary</p>
                </div>
              </div>

              {/* Greeting */}
              <h1 className="text-[42px] font-extrabold text-gray-900 mb-3 tracking-[-0.04em] leading-[1.1] font-[family-name:var(--font-display)]">
                Bonjour, <span className="bg-gradient-to-r from-[#2e7d32] via-[#388e3c] to-[#2e7d32] bg-clip-text text-transparent italic">Admin</span>.
              </h1>
              
              <p className="text-[15px] text-gray-600 text-center mb-12 max-w-lg leading-relaxed tracking-[-0.01em]">
                Ready to streamline your hotel operations? Let's get started.
              </p>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[820px] w-full">
                <button
                  onClick={() => handleActionClick("I want to onboard a new hotel")}
                  className="group relative p-6 bg-white/90 backdrop-blur-md border border-gray-200/80 rounded-2xl hover:border-[#2e7d32]/60 shadow-sm hover:shadow-xl hover:shadow-[#2e7d32]/10 transition-all duration-500 text-left overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2e7d32]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2e7d32]/10 to-[#2e7d32]/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm">
                      <Zap size={22} className="text-[#2e7d32] group-hover:text-[#1b5e20] transition-colors" />
                    </div>
                    <h3 className="text-[17px] font-bold text-gray-900 mb-2 group-hover:text-[#2e7d32] transition-colors tracking-tight font-[family-name:var(--font-display)]">Onboard Hotel</h3>
                    <p className="text-[13px] text-gray-600 leading-relaxed tracking-[-0.005em]">
                      Register a new hotel customer with complete details and setup.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => handleActionClick("I want to create a laundry agreement")}
                  className="group relative p-6 bg-white/90 backdrop-blur-md border border-gray-200/80 rounded-2xl hover:border-[#2e7d32]/60 shadow-sm hover:shadow-xl hover:shadow-[#2e7d32]/10 transition-all duration-500 text-left overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2e7d32]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2e7d32]/10 to-[#2e7d32]/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm">
                      <Code2 size={22} className="text-[#2e7d32] group-hover:text-[#1b5e20] transition-colors" />
                    </div>
                    <h3 className="text-[17px] font-bold text-gray-900 mb-2 group-hover:text-[#2e7d32] transition-colors tracking-tight font-[family-name:var(--font-display)]">Create Agreement</h3>
                    <p className="text-[13px] text-gray-600 leading-relaxed tracking-[-0.005em]">
                      Generate rental or laundry service agreements for hotels.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => handleActionClick("I want to update hotel details")}
                  className="group relative p-6 bg-white/90 backdrop-blur-md border border-gray-200/80 rounded-2xl hover:border-[#2e7d32]/60 shadow-sm hover:shadow-xl hover:shadow-[#2e7d32]/10 transition-all duration-500 text-left overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2e7d32]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2e7d32]/10 to-[#2e7d32]/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm">
                      <Eye size={22} className="text-[#2e7d32] group-hover:text-[#1b5e20] transition-colors" />
                    </div>
                    <h3 className="text-[17px] font-bold text-gray-900 mb-2 group-hover:text-[#2e7d32] transition-colors tracking-tight font-[family-name:var(--font-display)]">Update Hotel</h3>
                    <p className="text-[13px] text-gray-600 leading-relaxed tracking-[-0.005em]">
                      Modify existing hotel information and contact details.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto hidden-scrollbar flex flex-col pb-44">
              <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 pt-4 sm:pt-12 space-y-6 flex-1">
                {messages.map((msg) => (
                  <ChatMessage 
                    key={msg.id} 
                    sender={msg.sender} 
                    text={msg.text}
                    quickActions={msg.quickActions}
                    onQuickAction={handleSendMessage}
                    threadId={msg.thread_id}
                  >
                    {msg.form && (
                      <DynamicForm
                        schema={msg.form}
                        onComplete={(data, formData) => onFormComplete(data, formData, msg.form)}
                        disabled={msg.isFormSubmitted || false}
                        isLocked={msg.isLocked || false}
                        threadId={msg.thread_id}
                      />
                    )}
                  </ChatMessage>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-text-muted text-sm pb-4">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Thinking...</span>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            </div>
          )}

          {/* Chat Input - Always visible at bottom */}
          <div className="w-full absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-20 pb-8 pointer-events-none z-10">
            <div className="max-w-3xl mx-auto w-full px-6 pointer-events-auto">
              <ChatInput onSend={handleSendMessage} disabled={isLoading} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
