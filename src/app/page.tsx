/**
 * Home Page Component
 * 
 * Main entry point for the application that renders the Flashcards component
 * within a responsive container with appropriate spacing and background.
 */
import Flashcards from "@/Flashcards";

export default function Home() {
  return (
    <div className="min-h-screen py-4 w-full" style={{ background: 'var(--background)' }}>
      <Flashcards />
    </div>
  );
}