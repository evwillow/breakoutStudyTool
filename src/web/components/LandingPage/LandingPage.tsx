/**
 * @fileoverview Marketing landing page component featuring hero content, preview, and CTAs.
 * @module src/web/components/LandingPage/LandingPage.tsx
 * @dependencies React, next/link, next/script, ../Auth/AuthModal, ./LandingDrillPreview
 */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { AuthModal } from "../Auth";
import LandingDrillPreview from "./LandingDrillPreview";
import { TypedFeatures } from "./components";


interface FeatureCard {
  action: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const FEATURE_CARDS: FeatureCard[] = [
  {
    action: "Train",
    title: "Train on real charts",
    description: "Every session serves up a clean breakout play so you can drill pattern recognition without hunting for examples first.",
    icon: (
      <svg className="w-8 h-8 text-turquoise-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 19h16" />
        <path d="M9 19V5h6v14" />
        <path d="M12 9h6l-2 3 2 3h-6" />
      </svg>
    ),
  },
  {
    action: "Track",
    title: "Track your reps",
    description: "Each mark you drop is scored and saved to your account, so you can watch accuracy trends improve with every run.",
    icon: (
      <svg className="w-8 h-8 text-turquoise-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 7h18" />
        <path d="M5 11h6" />
        <path d="M5 15h10" />
        <path d="M5 19h14" />
        <path d="M9 3h6" />
      </svg>
    ),
  },
  {
    action: "Compare",
    title: "Compare instantly",
    description: "Hit reveal to overlay the actual move and see exactly how close your projection came, with no guesswork.",
    icon: (
      <svg className="w-8 h-8 text-turquoise-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="8" cy="12" r="3" />
        <circle cx="16" cy="12" r="3" />
        <path d="M11 12h2" />
        <path d="M4 12h1" />
        <path d="M19 12h1" />
      </svg>
    ),
  },
  {
    action: "Improve",
    title: "Improve every session",
    description: "Jump between related charts and replay previous rounds to tighten your plan before the real market opens.",
    icon: (
      <svg className="w-8 h-8 text-turquoise-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3v18" />
        <path d="M4 15l8 6 8-6" />
        <path d="M4 9l8-6 8 6" />
      </svg>
    ),
  },
];

const CTA_BUTTON_CLASS = "px-10 py-4 rounded-full font-semibold text-base sm:text-lg bg-emerald-500 text-slate-900 shadow-[0_18px_40px_rgba(16,185,129,0.35)] hover:shadow-[0_24px_70px_rgba(16,185,129,0.45)] transition transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/60";

interface HowItWorksStep {
  title: string;
  description: string;
}

const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    title: "Choose a breakout",
    description: "Pick a curated setup and load the drill in seconds—no data wrangling required.",
  },
  {
    title: "Mark your target",
    description: "Before the reveal, click where you expect price to travel. A built-in timer keeps every rep focused.",
  },
  {
    title: "Reveal & score",
    description: "We reveal the move, score your placement automatically, and track accuracy for you.",
  },
  {
    title: "Review your rounds",
    description: "Open your past rounds, replay the tape, and spot patterns in what's working best.",
  },
];

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What data powers the drills?",
    answer: "We maintain a library of breakout setups drawn from decades of market history. You get the ready-to-train charts without touching spreadsheets or scripts.",
  },
  {
    question: "How is feedback generated?",
    answer: "Once you place your marker, we compare it to the actual breakout move and return an accuracy score so you know instantly how close you were.",
  },
  {
    question: "Where is my progress saved?",
    answer: "Your rounds and scores live in your account. Open the history panel any time to replay, export, or clear past sessions.",
  },
];

const TESTIMONIAL = {
  name: "Beta trader",
  role: "Early access user",
  quote: "The repetition loop keeps me sharp. It's the fastest way I've found to stress-test breakout plans before risking capital.",
};

interface LandingPageProps {
  onSignIn: () => void;
}

/**
 * LandingPage Component
 * 
 * Premium marketing landing page designed to convert visitors into users.
 * Features:
 * - Hero section with clear value proposition and call-to-action
 * - Feature highlights with professional icons
 * - Social proof from successful traders
 * - Premium design elements and visual hierarchy
 * - Conversion-optimized copy and color scheme
 */
const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [demoHighlight, setDemoHighlight] = useState(false);

  const structuredData = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Breakout Study Tool",
    "url": "https://breakoutstudytool.com",
    "description": "Train breakout recognition with guided drills, instant after-charts, and objective feedback.",
    "publisher": {
      "@type": "Organization",
      "name": "Breakout Study Tool"
    }
  }), []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight;
      const docHeight = document.body.scrollHeight || 1;
      const progress = scrollPosition / docHeight;
      setShowStickyCTA(progress >= 0.6);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleOpenSignup = (): void => {
    setShowAuth(true);
  };

  return (
    <div className="font-sans overflow-visible min-h-screen flex flex-col">
      <Script
        id="landingpage-structured-data"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Hero Section with premium design and stronger value proposition */}
      <section className="relative overflow-hidden bg-transparent pt-10 sm:pt-16 lg:pt-18 pb-12 sm:pb-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-48 -left-52 h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-[260px]" />
          <div className="absolute top-[18%] right-[-25%] h-[520px] w-[520px] bg-emerald-500/12 blur-[240px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-32 w-[60%] bg-gradient-to-b from-transparent via-emerald-400/8 to-transparent" />
        </div>

        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] items-center">
          <div className="flex flex-col items-start text-left gap-6 justify-center">
            <div>
              <h1 className="text-[2.6rem] sm:text-[3rem] lg:text-[3.4rem] font-black leading-tight text-white drop-shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                Train breakout recognition.
                <br className="hidden sm:block" />React faster. Trade smarter.
              </h1>
              <p className="mt-3 text-lg sm:text-xl text-emerald-100/90 max-w-2xl font-semibold">
                Focused drills, instant after-charts, and feedback that tells you exactly how tight your plan really is.
              </p>
            </div>
            <div className="w-full max-w-xl">
              <TypedFeatures />
            </div>
            <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl">
              Practice on curated breakout archives, place a target before reveal, then watch your score log automatically so you can revisit every round.
            </p>
            <div className="flex flex-col sm:flex-row items-center sm:items-stretch sm:justify-start w-full sm:w-auto space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={handleOpenSignup}
                className={`${CTA_BUTTON_CLASS} w-full sm:w-auto`}
              >
                Start Free Practice
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    const section = document.getElementById('demo');
                    const isMobile = window.innerWidth < 640;
                    if (section && isMobile) {
                      section.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }
                  setDemoHighlight(true);
                  setTimeout(() => setDemoHighlight(false), 1600);
                }}
                className="w-full sm:w-auto px-10 py-4 rounded-full font-semibold text-base sm:text-lg border border-white/15 bg-white/5 text-white hover:bg-white/10 transition text-center backdrop-blur"
              >
                See Demo
              </button>
            </div>
            <p className="mt-4 text-sm text-emerald-100/80 uppercase tracking-[0.4em] font-semibold">
              No credit card required • Privacy-first by design
            </p>
          </div>

          <div className="w-full max-w-[420px] justify-self-start" id="demo">
            <LandingDrillPreview highlight={demoHighlight} />
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="relative py-20 sm:py-24">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" aria-hidden="true" />
        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-emerald-200/80 uppercase tracking-[0.45em] text-xs sm:text-sm font-semibold">
              How the breakout drill works
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-white">
              Four steps from selection to measured feedback
            </h2>
            <p className="mt-3 text-base sm:text-lg text-white/70 max-w-2xl mx-auto">
              Each repetition follows the same rhythm so you can focus on timing, placement, and reviewing objective scores instead of guesswork.
            </p>
          </div>
          <div className="relative mt-14">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" aria-hidden="true" />
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="relative bg-white/5 text-white px-6 py-8 rounded-2xl border border-white/10 shadow-[0_14px_50px_rgba(12,18,24,0.45)] backdrop-blur"
                >
                  <div className="flex items-center gap-4 mb-5">
                    <span className="flex items-center justify-center w-10 h-10 rounded-full border border-emerald-400/50 text-emerald-200/80 font-semibold text-sm">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-xl font-semibold text-white/95 leading-tight">{step.title}</h3>
                  </div>
                  <p className="text-sm sm:text-base text-white/75 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#03080b] py-16 sm:py-20">
        <div className="max-w-[720px] mx-auto text-center px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready to sharpen every breakout?</h2>
          <p className="mt-3 text-base sm:text-lg text-white/70">
            Join the beta and get immediate access to curated drills, instant feedback, and a workflow built to cut hesitation.
          </p>
          <div className="mt-8 flex justify-center">
            <button onClick={handleOpenSignup} className={CTA_BUTTON_CLASS}>
              Start Free Practice
            </button>
          </div>
        </div>
      </section>
 
      {showStickyCTA && (
        !showAuth && (
          <div className="fixed bottom-6 left-0 right-0 z-[999] px-4 pointer-events-none">
            <div className="pointer-events-auto max-w-[680px] mx-auto bg-slate-950/95 border border-emerald-400/35 rounded-2xl shadow-[0_18px_45px_rgba(16,185,129,0.4)] backdrop-blur-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm sm:text-base text-white/80">
                <span className="font-semibold text-white">Keep the reps going.</span> Jump back into the breakout drill any time.
              </div>
              <button onClick={handleOpenSignup} className={`${CTA_BUTTON_CLASS} w-full sm:w-auto`}>
                Start Free Practice
              </button>
            </div>
          </div>
        )
      )}

      {/* FAQ */}
      <section id="landing-faq" className="relative py-20 sm:py-24">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" aria-hidden="true" />
        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-emerald-200/80 uppercase tracking-[0.4em] text-xs sm:text-sm font-semibold">FAQ</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-white">What traders ask most</h2>
            <p className="mt-3 text-base sm:text-lg text-white/70 max-w-2xl mx-auto">Straight answers about the dataset powering the drills, how feedback is generated, and where your progress is stored.</p>
          </div>
          <div className="grid gap-6 lg:gap-8 md:grid-cols-2">
            {FAQ_ITEMS.map(item => (
              <div
                key={item.question}
                className="bg-[#081c1d]/70 text-white px-6 py-7 rounded-2xl border border-white/10 shadow-[0_10px_40px_rgba(13,148,136,0.25)] flex flex-col gap-3"
              >
                <h4 className="text-lg font-semibold text-white/95">{item.question}</h4>
                <p className="text-sm sm:text-base text-white/75 leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer removed - global footer is rendered in layout */}
      {showAuth && (
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} initialMode={"SIGNUP"} />
      )}
    </div>
  );
};

export default LandingPage;

