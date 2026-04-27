/**
 * Widget Layout Component
 * Reusable layout for chat widgets with consistent styling
 */

import React, { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

export interface WidgetBadge {
  label: string;
  variant?: "default" | "active" | "inactive" | "primary" | "pending";
  className?: string;
}

export interface WidgetAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  className?: string;
}

export interface WidgetLayoutProps {
  /** Widget title */
  title: string;
  
  /** Icon component to display next to title */
  icon?: LucideIcon;
  
  /** Icon size (default: 18) */
  iconSize?: number;
  
  /** Badges to display in header */
  badges?: WidgetBadge[];
  
  /** Action buttons to display in header */
  actions?: WidgetAction[];
  
  /** Main content */
  children: ReactNode;
  
  /** Empty state to show when no content */
  emptyState?: ReactNode;
  
  /** Whether to show empty state */
  isEmpty?: boolean;
  
  /** Additional className for the card */
  className?: string;
  
  /** Additional className for the header */
  headerClassName?: string;
  
  /** Additional className for the content */
  contentClassName?: string;
  
  /** Max width constraint */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl" | "full";
  
  /** Preamble text to show before widget */
  preamble?: string | ReactNode;
  
  /** Postamble text to show after widget */
  postamble?: string | ReactNode;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  full: "max-w-full"
};

/**
 * Reusable widget layout component
 * Provides consistent structure for all chat widgets
 */
export function WidgetLayout({
  title,
  icon: Icon,
  iconSize = 18,
  badges = [],
  actions = [],
  children,
  emptyState,
  isEmpty = false,
  className = "",
  headerClassName = "",
  contentClassName = "",
  maxWidth = "4xl",
  preamble,
  postamble
}: WidgetLayoutProps) {
  const maxWidthClass = maxWidthClasses[maxWidth];
  
  return (
    <div className={`space-y-3 ${maxWidthClass}`}>
      {/* Preamble */}
      {preamble && (
        <div className="text-sm text-text-body leading-relaxed">
          {typeof preamble === 'string' ? <p>{preamble}</p> : preamble}
        </div>
      )}
      
      {/* Main Card */}
      <Card className={`overflow-hidden border-border/60 shadow-sm ${className}`}>
        {/* Header */}
        <CardHeader 
          className={`bg-surface/40 border-b py-3 px-4 flex flex-row items-center justify-between ${headerClassName}`}
        >
          {/* Title Section */}
          <div className="flex items-center gap-2">
            {Icon && <Icon size={iconSize} className="text-primary" />}
            <CardTitle className="text-sm font-bold text-text-heading">
              {title}
            </CardTitle>
          </div>
          
          {/* Badges and Actions Section */}
          <div className="flex items-center gap-2">
            {/* Badges */}
            {badges.map((badge, index) => (
              <Badge
                key={index}
                variant={badge.variant || "default"}
                className={`text-[10px] font-bold h-5 px-1.5 ${badge.className || ''}`}
              >
                {badge.label}
              </Badge>
            ))}
            
            {/* Actions */}
            {actions.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <Button
                  key={index}
                  onClick={action.onClick}
                  size="sm"
                  variant={action.variant || "outline"}
                  className={`h-7 px-2 text-[11px] gap-1.5 ${action.className || ''}`}
                >
                  {ActionIcon && <ActionIcon size={14} />}
                  {action.label}
                </Button>
              );
            })}
          </div>
        </CardHeader>
        
        {/* Content */}
        <CardContent className={`p-0 ${contentClassName}`}>
          {isEmpty && emptyState ? emptyState : children}
        </CardContent>
      </Card>
      
      {/* Postamble */}
      {postamble && (
        <div className="text-sm text-text-body leading-relaxed">
          {typeof postamble === 'string' ? <p>{postamble}</p> : postamble}
        </div>
      )}
    </div>
  );
}

/**
 * Default empty state component
 */
export function DefaultEmptyState({ 
  message = "No data available",
  actionLabel,
  onAction
}: { 
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="p-8 text-center space-y-4">
      <div className="text-text-muted text-sm italic">
        {message}
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
