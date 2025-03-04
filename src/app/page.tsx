/**
 * Home Page Component
 * 
 * Main entry point for the application that renders the Flashcards component
 * within a responsive container with appropriate spacing and background.
 */
import Flashcards from "@/Flashcards";

export default function Home() {
  return (
    <div className="min-h-screen pt-8 pb-8 flex justify-center items-start bg-soft-gray-50">
      <Flashcards />
    </div>
  );
}