/**
 * @fileoverview Type definitions supporting Header navigation components.
 * @module src/web/components/Header/Header.types.ts
 * @dependencies none
 */
/**
 * Navigation link structure
 */
export interface NavLink {
  name: string;
  href: string;
  isScroll?: boolean;
}

/**
 * Touch position structure
 */
export interface TouchPosition {
  x: number;
  y: number;
}

