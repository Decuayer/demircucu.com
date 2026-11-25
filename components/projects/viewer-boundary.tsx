"use client";

import { Component, type ReactNode } from "react";

/**
 * Keeps a failing viewer (react-pdf throws load and render errors to the nearest error boundary)
 * from taking down the whole page: the fallback replaces only the viewer.
 */
export class ViewerBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Document viewer failed", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
