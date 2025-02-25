// src/app/providers.js
"use client";

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }) {
  // You can add this to debug session issues
  console.log("SessionProvider initialized");
  return <SessionProvider>{children}</SessionProvider>;
}