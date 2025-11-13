/**
 * @fileoverview Study page entry point rendering the flashcard container for interactive drills.
 * @module src/web/app/study/page.tsx
 * @dependencies React, @/components/Flashcards/FlashcardsContainer
 */
import FlashcardsContainer from "@/components/Flashcards/FlashcardsContainer";

export default function StudyPage() {
  return <FlashcardsContainer />;
}
