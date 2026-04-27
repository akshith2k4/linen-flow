"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { HotelInfoTabs } from "./hotel-info-tabs";
import { OrderDetailsWidget } from "./orders/order-details-widget";
import { OrderListWidget } from "./orders/order-list-widget";
import { PickupFulfillmentWidget } from "./orders/pickup-fulfillment-widget";
import { SearchFormWidget } from "./search-form-widget";
import { HotelOrderSearchWidget } from "../forms/hotel-order-search-widget";
import { WidgetErrorBoundary } from "@/components/shared/widget-error-boundary";

interface MessageContentProps {
  text: string;
  threadId?: string;
}

export function MessageContent({ text, threadId }: MessageContentProps) {
  let parsedPayload: any = null;
  let hasJson = false;

  try {
    // Try parsing as direct JSON first (LLM now outputs raw JSON)
    parsedPayload = JSON.parse(text);
    hasJson = true;
  } catch (e) {
    // Fallback: try extracting from markdown code block (legacy)
    try {
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
      if (jsonMatch) {
        parsedPayload = JSON.parse(jsonMatch[1]);
        hasJson = true;
      }
    } catch (e2) {
      // Not valid JSON
    }
  }

  if (hasJson && parsedPayload?.ui_widget === "hotel_details") {
    return (
      <WidgetErrorBoundary>
        <HotelInfoTabs data={parsedPayload.data} />
      </WidgetErrorBoundary>
    );
  }

  if (hasJson && parsedPayload?.ui_widget === "entity_list") {
    return (
      <WidgetErrorBoundary>
        <StructuredEntityList data={parsedPayload.data} threadId={threadId} />
      </WidgetErrorBoundary>
    );
  }

  if (hasJson && parsedPayload?.ui_widget === "order_details") {
    return (
      <WidgetErrorBoundary>
        <OrderDetailsWidget data={parsedPayload.data} />
      </WidgetErrorBoundary>
    );
  }

  if (hasJson && parsedPayload?.ui_widget === "order_list") {
    return (
      <WidgetErrorBoundary>
        <OrderListWidget data={parsedPayload.data} />
      </WidgetErrorBoundary>
    );
  }

  if (hasJson && parsedPayload?.ui_widget === "pickup_fulfillment") {
    return (
      <WidgetErrorBoundary>
        <PickupFulfillmentWidget data={parsedPayload.data} />
      </WidgetErrorBoundary>
    );
  }

  if (hasJson && parsedPayload?.ui_widget === "search_form") {
    return (
      <WidgetErrorBoundary>
        <SearchFormWidget data={parsedPayload.data} threadId={threadId} />
      </WidgetErrorBoundary>
    );
  }

  if (hasJson && parsedPayload?.ui_widget === "hotel_order_search") {
    return (
      <WidgetErrorBoundary>
        <HotelOrderSearchWidget data={parsedPayload.data} threadId={threadId} />
      </WidgetErrorBoundary>
    );
  }

  if (hasJson && parsedPayload?.message) {
    return (
      <div className="space-y-3">
        <FormattedText text={parsedPayload.message} />
        
        {/* Show search button if backend indicates search is needed */}
        {parsedPayload.show_search_button && (
          <button
            onClick={() => {
              const searchType = parsedPayload.search_type || 'hotel';
              const message = searchType === 'hotel' 
                ? 'I want to search for a hotel' 
                : 'I want to search for orders';
              
              const event = new CustomEvent('sendChatMessage', { 
                detail: { message }
              });
              window.dispatchEvent(event);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search for {parsedPayload.search_type === 'order' ? 'orders' : 'hotel'}
          </button>
        )}
      </div>
    );
  }

  // Fallback for plain text
  return <FormattedText text={text} />;
}


function MarkdownTable({ tableText }: { tableText: string }) {
  const sanitize = (html: string) => {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '');
  };

  const rows = tableText
    .split("\n")
    .map((r) => r.trim())
    .filter((r) => r.startsWith("|") && r.endsWith("|"));

  if (rows.length < 2) return null;

  const headerCells = rows[0]
    .split("|")
    .slice(1, -1)
    .map((h) => h.trim());

  const dataRows = rows.slice(2).map((row) =>
    row
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim())
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border my-3">
      <table className="w-full text-sm">
        <thead className="bg-surface/60">
          <tr>
            {headerCells.map((header, idx) => (
              <th
                key={idx}
                className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide border-b border-border"
              >
                {header.replace(/\*\*/g, "")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((cells, rowIdx) => (
            <tr
              key={rowIdx}
              className={`border-b border-border last:border-0 ${rowIdx % 2 === 0 ? "bg-white" : "bg-surface/30"
                } hover:bg-primary/5 transition-colors`}
            >
              {cells.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-4 py-2.5 text-text-body">
                  <span dangerouslySetInnerHTML={{
                    __html: sanitize(cell
                      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                      .replace(/`(.+?)`/g, '<code class="bg-surface px-1 rounded text-xs font-mono">$1</code>'))
                  }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormattedText({ text }: { text: string }) {
  const sanitize = (html: string) => {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '');
  };

  const format = (t: string) => {
    const formatted = t
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-text-heading">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-primary/5 px-1.5 py-0.5 rounded text-xs font-mono text-primary border border-primary/10">$1</code>')
      .replace(/₹(\d+(?:\.\d+)?)/g, '<span class="font-semibold text-primary">₹$1</span>');
    return sanitize(formatted);
  };

  const lines = text.split("\n");
  const blocks: { type: "table" | "heading" | "list" | "line" | "spacer"; content: string; level?: number }[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith("|") && line.indexOf("|", 1) !== -1) {
      let tableLines = [lines[i]];
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith("|")) {
        tableLines.push(lines[j]);
        j++;
      }
      blocks.push({ type: "table", content: tableLines.join("\n") });
      i = j;
    } else if (line.startsWith("#")) {
      const match = line.match(/^(#+)\s+(.+)$/);
      if (match) {
        blocks.push({ type: "heading", content: match[2], level: match[1].length });
      } else {
        blocks.push({ type: "line", content: lines[i] });
      }
      i++;
    } else if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
      blocks.push({ type: "list", content: line.replace(/^[-*•]\s+/, "") });
      i++;
    } else if (!line) {
      blocks.push({ type: "spacer", content: "" });
      i++;
    } else {
      blocks.push({ type: "line", content: lines[i] });
      i++;
    }
  }

  return (
    <div className="space-y-3 text-[14px] max-w-4xl text-text-body/90 leading-relaxed font-sans scroll-mt-20">
      {blocks.map((block, idx) => {
        if (block.type === "table") {
          return <MarkdownTable key={idx} tableText={block.content} />;
        }
        if (block.type === "heading") {
          if (block.level === 1) return <h1 key={idx} className="text-xl font-bold text-text-heading pt-4 pb-1 border-b border-border/50 mb-2">{block.content}</h1>;
          if (block.level === 2) return <h2 key={idx} className="text-lg font-bold text-text-heading pt-3 pb-0.5 mb-1">{block.content}</h2>;
          return <h3 key={idx} className="text-base font-bold text-text-heading pt-2 pb-0.5 mb-1">{block.content}</h3>;
        }
        if (block.type === "list") {
          return (
            <div key={idx} className="flex gap-2.5 items-start pl-1.5 py-0.5">
              <span className="text-primary font-bold mt-1 text-[10px]">•</span>
              <p className="flex-1" dangerouslySetInnerHTML={{ __html: format(block.content) }} />
            </div>
          );
        }
        if (block.type === "spacer") {
          return <div key={idx} className="h-0" />;
        }

        return <p key={idx} className="min-h-[1.5rem]" dangerouslySetInnerHTML={{ __html: format(block.content) }} />;
      })}
    </div>
  );
}

function StructuredEntityList({ data, threadId }: { data: any; threadId?: string }) {
  const { title, total_count, page, page_size, entities, preamble, postamble, show_search_form, pagination_params } = data;
  
  const [selectedHotelId, setSelectedHotelId] = React.useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(page || 0);
  const [currentEntities, setCurrentEntities] = React.useState(entities || []);
  const [isLoadingPage, setIsLoadingPage] = React.useState(false);
  
  // Store pagination params from initial search (contains operation type and search filters)
  // Fallback: infer operation from title if pagination_params is missing
  const [paginationContext, setPaginationContext] = React.useState(() => {
    if (pagination_params) {
      return pagination_params;
    }
    // Fallback: infer operation type from title
    const titleLower = title?.toLowerCase() || '';
    if (titleLower.includes('hotel')) {
      return { method: 'list_hotels', page: page || 0, size: page_size || 5 };
    } else if (titleLower.includes('pool')) {
      return { method: 'list_inventory_pools', page: page || 0, size: page_size || 5 };
    } else if (titleLower.includes('reservation')) {
      return { method: 'list_reservations', page: page || 0, size: page_size || 5 };
    }
    return null;
  });
  
  React.useEffect(() => {
    if (pagination_params) {
      setPaginationContext(pagination_params);
    }
  }, [pagination_params]);
  
  const isHotelList = title?.toLowerCase().includes("hotel") || entities?.some((e: any) => e.name && e.id);
  
  // Show search form if explicitly requested (for search results)
  const shouldShowSearchForm = isHotelList && show_search_form === true;
  
  // Calculate pagination
  const hasNextPage = total_count !== undefined && page_size !== undefined && ((currentPage + 1) * page_size < total_count);
  const hasPrevPage = currentPage > 0;
  
  // Handle hotel selection - auto-submit to fetch details
  const handleHotelClick = (hotelId: string) => {
    if (isHotelList && !isSubmitted) {
      setSelectedHotelId(hotelId);
      setIsSubmitted(true);
      
      // Auto-submit to fetch hotel details
      const event = new CustomEvent('sendChatMessage', { 
        detail: { message: `Show me details for hotel ID ${hotelId}` }
      });
      window.dispatchEvent(event);
    }
  };
  
  // Handle pagination - DIRECT API CALL (bypasses LLM)
  const handlePagination = async (direction: 'next' | 'prev') => {
    const newPage = direction === 'next' ? currentPage + 1 : currentPage - 1;
    setIsLoadingPage(true);
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      if (!paginationContext) {
        console.error('❌ No pagination context available');
        alert('Unable to paginate. Please try searching again.');
        setIsLoadingPage(false);
        return;
      }
      
      console.log(`🔄 Direct pagination: direction=${direction}, page=${newPage}, operation=${paginationContext.method}`);
      
      // Build clean params without the 'method' field
      const { method, ...cleanParams } = paginationContext;
      
      const requestBody = {
        operation: method, // e.g., 'list_hotels'
        params: {
          ...cleanParams, // includes any search filters
          page: newPage,
          size: paginationContext.size || page_size || 5
        },
        thread_id: threadId // optional, for logging
      };
      
      console.log('📤 Sending pagination request:', requestBody);
      
      // Call direct pagination endpoint (bypasses LLM)
      const response = await fetch(`${backendUrl}/api/paginate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Pagination failed:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📦 Direct pagination response:', result);
      
      // Update entities from direct API response
      if (result.ui_widget === 'entity_list' && result.data?.entities) {
        setCurrentEntities(result.data.entities);
        setCurrentPage(result.data.page !== undefined ? result.data.page : newPage);
        console.log(`✅ Updated to page ${result.data.page}, ${result.data.entities.length} entities`);
      } else {
        console.error('❌ Unexpected response format:', result);
        alert('Unexpected response format. Please try again.');
      }
    } catch (error) {
      console.error('❌ Pagination error:', error);
      alert('Failed to load page. Please try again.');
    } finally {
      setIsLoadingPage(false);
    }
  };
  
  return (
    <div className="space-y-3 max-w-4xl">
      {preamble && <FormattedText text={preamble} />}
      <Card className="overflow-hidden border-border/60 shadow-sm transition-all duration-300">
        <CardHeader className="bg-surface/40 border-b py-3 px-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-primary" />
            <CardTitle className="text-sm font-bold text-text-heading">{title || "Results List"}</CardTitle>
          </div>
          {total_count !== undefined && (
            <Badge variant="default" className="text-[10px] font-bold h-5 px-1.5 bg-primary/10 text-primary border-primary/20">
              {total_count} Total
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingPage ? (
            <div className="p-8 flex items-center justify-center gap-2 text-text-muted">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {currentEntities.map((entity: any, idx: number) => (
                <button
                  key={`${entity.id}-${idx}`}
                  onClick={() => handleHotelClick(entity.id)}
                  disabled={!isHotelList || isSubmitted}
                  className={`w-full p-3 px-4 transition-all group flex items-center justify-between animate-in fade-in slide-in-from-left-2 duration-300 fill-mode-both text-left ${
                    isHotelList && !isSubmitted
                      ? 'hover:bg-primary/[0.03] cursor-pointer' 
                      : 'cursor-not-allowed opacity-60'
                  } ${selectedHotelId === entity.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    {isHotelList && (
                      <div className={`w-4 h-4 rounded-full border-2 transition-all flex-shrink-0 flex items-center justify-center ${
                        selectedHotelId === entity.id 
                          ? 'border-primary bg-primary' 
                          : isSubmitted 
                          ? 'border-border/50' 
                          : 'border-border group-hover:border-primary'
                      }`}>
                        {selectedHotelId === entity.id && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold transition-colors truncate ${
                        selectedHotelId === entity.id ? 'text-primary' : isSubmitted ? 'text-text-muted' : 'text-text-heading group-hover:text-primary'
                      }`}>
                        {entity.name || "Unnamed Record"}
                      </div>
                      {entity.subtext && (
                        <div className="text-[11px] text-text-muted mt-0.5 truncate opacity-80">{entity.subtext}</div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <div className={`text-[10px] font-mono text-text-muted bg-surface/50 px-2 py-0.5 rounded border transition-all ${
                      isSubmitted ? 'border-border/50' : 'border-border group-hover:border-primary/20 group-hover:bg-primary/5'
                    }`}>
                      ID: {entity.id}
                    </div>
                  </div>
                </button>
              ))}
              {(!currentEntities || currentEntities.length === 0) && (
                <div className="p-8 text-center text-text-muted text-sm italic">
                  No entries found.
                </div>
              )}
            </div>
          )}
          
          {/* Search Button - triggers LLM to render search form */}
          {shouldShowSearchForm && !isSubmitted && (
            <div className="border-t border-border/40 bg-surface/20 p-4">
              <button
                onClick={() => {
                  // Ask LLM to render the search form
                  const event = new CustomEvent('sendChatMessage', { 
                    detail: { message: 'I want to search for a hotel' }
                  });
                  window.dispatchEvent(event);
                }}
                disabled={isLoadingPage}
                className="w-full px-4 py-2.5 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/30 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search for a different hotel
              </button>
            </div>
          )}
          

        </CardContent>
        {page !== undefined && total_count !== undefined && page_size !== undefined && total_count > 0 && (
          <div className="bg-surface/20 px-4 py-3 border-t border-border/40 flex items-center justify-between">
             <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
               Page {currentPage + 1} • Showing {Math.min(currentEntities.length, page_size)} items
             </div>
             <div className="flex items-center gap-3">
               {/* Pagination Buttons */}
               <div className="flex items-center gap-2">
                 <button
                   onClick={() => handlePagination('prev')}
                   disabled={!hasPrevPage || isLoadingPage}
                   className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg border transition-all ${
                     hasPrevPage && !isLoadingPage
                       ? 'border-primary/30 text-primary hover:bg-primary/5 hover:border-primary cursor-pointer'
                       : 'border-border/30 text-text-muted/40 cursor-not-allowed'
                   }`}
                 >
                   ← Previous
                 </button>
                 <button
                   onClick={() => handlePagination('next')}
                   disabled={!hasNextPage || isLoadingPage}
                   className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg border transition-all ${
                     hasNextPage && !isLoadingPage
                       ? 'border-primary/30 text-primary hover:bg-primary/5 hover:border-primary cursor-pointer'
                       : 'border-border/30 text-text-muted/40 cursor-not-allowed'
                   }`}
                 >
                   Next →
                 </button>
               </div>
               
               {/* Progress Bar */}
               <div className="flex items-center gap-2">
                 <div className="text-[10px] font-bold text-text-muted opacity-60">
                   {Math.round((Math.min((currentPage + 1) * page_size, total_count) / total_count) * 100)}%
                 </div>
                 <div className="w-20 h-1 bg-border/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-700 ease-in-out" 
                      style={{ width: `${Math.min((Math.min((currentPage + 1) * page_size, total_count) / total_count) * 100, 100)}%` }} 
                    />
                 </div>
               </div>
             </div>
          </div>
        )}
      </Card>
      {postamble && <FormattedText text={postamble} />}
    </div>
  );
}
