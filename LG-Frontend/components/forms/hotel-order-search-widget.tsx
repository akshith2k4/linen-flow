"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Search, Loader2, CheckCircle2, Lock } from "lucide-react";
import axios from "axios";

interface HotelOrderSearchWidgetProps {
  data: {
    title?: string;
    description?: string;
  };
  threadId?: string;
}

export function HotelOrderSearchWidget({ data, threadId }: HotelOrderSearchWidgetProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.get(`${backendUrl}/api/customers/search`, {
        params: { 
          name: searchQuery,
          q: searchQuery 
        },
        timeout: 10000,
      });

      let searchResults = [];
      if (Array.isArray(response.data)) {
        searchResults = response.data;
      } else if (response.data?.content && Array.isArray(response.data.content)) {
        searchResults = response.data.content;
      }

      setResults(searchResults);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectResult = (result: any) => {
    // Mark as selected and make read-only
    setSelectedItem(result);
    
    // Send the selection as a form submission
    const event = new CustomEvent('sendChatMessage', { 
      detail: { 
        message: `Show me orders for hotel ID ${result.id}`,
        formData: { customer_id: result.id }
      }
    });
    window.dispatchEvent(event);
  };

  return (
    <Card className="max-w-[500px] border-border/60 shadow-sm">
      <CardHeader className="bg-surface/40 border-b py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
            selectedItem ? 'bg-green-100' : 'bg-primary/10'
          }`}>
            {selectedItem ? (
              <CheckCircle2 size={18} className="text-green-600" />
            ) : (
              <Search size={18} className="text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-bold text-text-heading">
              {data.title || "Find Hotel to View Orders"}
            </CardTitle>
            {data.description && !selectedItem && (
              <p className="text-xs text-text-muted mt-0.5">
                {data.description}
              </p>
            )}
            {!data.description && !selectedItem && (
              <p className="text-xs text-text-muted mt-0.5">
                Search and select a hotel to view its active and past orders
              </p>
            )}
          </div>
          {selectedItem && (
            <Lock size={14} className="text-green-600 flex-shrink-0" />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-3">
        {selectedItem ? (
          // Read-only selected state
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-green-900 text-sm truncate">
                  {selectedItem.name}
                </p>
                <p className="text-xs font-mono text-green-700 mt-0.5">
                  ID: {selectedItem.id}
                </p>
              </div>
              <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 ml-2" />
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <SearchInput
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                placeholder="Type hotel name to search for orders..."
                className="text-sm"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="animate-spin h-4 w-4 text-text-muted" />
                </div>
              )}
            </div>

            {/* Search Results */}
            {hasSearched && (
              <div className="space-y-2">
                {results.length > 0 ? (
                  <div className="border border-border/60 rounded-lg overflow-hidden">
                    <div className="bg-surface/30 px-3 py-1.5 border-b border-border/40">
                      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                        {results.length} result{results.length !== 1 ? 's' : ''} found
                      </p>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {results.map((result: any) => (
                        <button
                          key={result.id}
                          onClick={() => selectResult(result)}
                          className="w-full text-left px-3 py-2.5 hover:bg-primary/5 transition-colors border-b border-border/20 last:border-0 group"
                        >
                          <div className="font-semibold text-text-heading text-sm group-hover:text-primary transition-colors">
                            {result.name}
                          </div>
                          <div className="text-xs font-mono text-text-muted mt-0.5 opacity-80">
                            ID: {result.id}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-text-muted">
                    <Search size={28} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No hotels found matching "{query}"</p>
                    <p className="text-[10px] mt-1 opacity-75">Try a different search term</p>
                  </div>
                )}
              </div>
            )}

            {!hasSearched && (
              <div className="text-center py-5 text-text-muted">
                <Search size={22} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">Start typing to search for hotels</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
