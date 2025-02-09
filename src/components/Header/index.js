"use client"

import Image from "next/image"
import Logo from "./Logo"
import instagram from "./instagram.png"
import X from "./x.png"
import { useState } from "react"

const Header = () => {
  const [click, setClick] = useState(false)

  const toggle = () => {
    setClick(!click)
  }

  return (
    <header className="relative w-full bg-white dark:bg-dark shadow-xl">
      <div className="absolute inset-0 -z-10">
        <svg
          viewBox="0 0 1440 400"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4a90e2" />
              <stop offset="50%" stopColor="#50e3c2" />
              <stop offset="100%" stopColor="#4a90e2" />
            </linearGradient>
          </defs>
          <rect width="1440" height="400" fill="url(#gradient)" />
          <path
            fill="url(#gradient)"
            d="M0,100 C480,300 960,0 1440,100 L1440,400 L0,400 Z"
            className="opacity-80"
          />
        </svg>
      </div>

      <div className="container mx-auto px-8 sm:px-12 py-6 flex items-center justify-between">
        <Logo />
        <div className="flex items-center space-x-3 justify-start">
          <a
            href="//x.com/evanwillowmoss"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow me on X"
          >
            <Image src={X} alt="X Logo" className="w-8 h-8 sm:w-12 sm:h-12" />
          </a>
          <a
            href="//instagram.com/evwillow"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow me on Instagram"
          >
            <Image
              src={instagram}
              alt="Instagram Logo"
              className="w-8 h-8 sm:w-12 sm:h-12"
            />
          </a>
        </div>
      </div>
    </header>
  )
}

export default Header
