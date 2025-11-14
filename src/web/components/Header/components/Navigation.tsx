/**
 * @fileoverview Desktop navigation component for header.
 * @module src/web/components/Header/components/Navigation.tsx
 * @dependencies React, next/link
 */
"use client";

import React from "react";
import Link from "next/link";
import type { NavLink } from "../Header.types";

export interface NavigationProps {
  links: NavLink[];
  scrolled: boolean;
  onScrollTo: (e: React.MouseEvent<HTMLAnchorElement>, id: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  links,
  scrolled,
  onScrollTo,
}) => {
  return (
    <nav className="hidden max-[800px]:hidden min-[800px]:flex justify-center space-x-4 z-10">
      {links.map((link) =>
        link.isScroll ? (
          <a
            key={link.name}
            href={link.href}
            onClick={(e) => onScrollTo(e, link.href.split('#')[1])}
            className={`${scrolled ? "text-gray-800 hover:text-turquoise-600" : "text-white hover:text-turquoise-300"} font-medium transition-colors whitespace-nowrap px-1`}
          >
            {link.name}
          </a>
        ) : (
          <Link
            key={link.name}
            href={link.href}
            prefetch={true}
            className={`${scrolled ? "text-gray-800 hover:text-turquoise-600" : "text-white hover:text-turquoise-300"} font-medium transition-colors whitespace-nowrap px-1`}
          >
            {link.name}
          </Link>
        )
      )}
    </nav>
  );
};

export default Navigation;

