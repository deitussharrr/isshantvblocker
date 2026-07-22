/**
 * Warning screen module for displaying blocked content messages.
 * Renders a parent-friendly overlay instead of blocked content.
 */
import type { FilterResult } from '../types';
/**
 * Create a warning element for blocked content
 */
export declare function createWarningElement(result: FilterResult, message?: string): HTMLElement;
/**
 * Create a full-page overlay warning for video pages
 */
export declare function createOverlayWarning(result: FilterResult, message?: string, brand?: string): HTMLElement;
/**
 * Apply blur effect to an element (blur action)
 */
export declare function applyBlur(element: HTMLElement): void;
/**
 * Check if warning styles are injected
 */
export declare function areWarningStylesInjected(): boolean;
//# sourceMappingURL=warning.d.ts.map