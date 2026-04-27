"use client";

import { Component, ReactNode } from "react";

export class WidgetErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="text-sm text-red-600 p-4 border border-red-200 rounded-lg bg-red-50">
          Failed to render this component. Data may be malformed.
        </div>
      );
    }
    return this.props.children;
  }
}
