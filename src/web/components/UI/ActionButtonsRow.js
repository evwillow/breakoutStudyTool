/**
 * @fileoverview Renders action buttons for flashcard responses with visual feedback and accessibility support.
 * @module src/web/components/UI/ActionButtonsRow.js
 * @dependencies React
 */
/**
 * ActionButtonsRow.js
 * 
 * Component for displaying a row of action buttons for user interaction.
 * Features:
 * - Responsive design that adapts to different screen sizes
 * - Visual feedback for selected buttons (correct/incorrect states)
 * - Compact mode for space-constrained layouts
 * - Optimized with React.memo for performance
 * - Consistent color scheme for different actions
 * - Keyboard shortcuts (1-4) for quick selection (hidden on mobile)
 */
import React from "react";

const ActionButtonsRow = React.memo(function ActionButtonsRow({
  actionButtons,
  selectedButtonIndex = null,
  correctAnswerButton = null,
  feedback = null,
  onButtonClick,
  disabled = false,
  isCompact = false,
  isTimeUp = false
}) {
  // Base styling for all buttons
  const baseClasses = "border-0 rounded-md shadow-lg flex items-center justify-center font-medium transition-all duration-200";
  
  // Color scheme for the different action buttons with improved gradients
  const desktopColorClasses = [
    "bg-gradient-to-br from-red-400 to-red-600 text-white hover:from-red-500 hover:to-red-700",    // Negative action (e.g., -5%)
    "bg-gradient-to-br from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700", // Neutral action (e.g., 0%)
    "bg-gradient-to-br from-lime-400 to-lime-600 text-black hover:from-lime-500 hover:to-lime-700",   // Positive action (e.g., 20%)
    "bg-gradient-to-br from-green-500 to-green-700 text-white hover:from-green-600 hover:to-green-800"   // Strong positive action (e.g., 50%)
  ];
  
  // Responsive classes with different sizing based on screen size and compact mode
  const defaultClasses = isCompact 
    ? [
        `${baseClasses} ${desktopColorClasses[0]} h-16 py-2 text-base`,
        `${baseClasses} ${desktopColorClasses[1]} h-16 py-2 text-base`,
        `${baseClasses} ${desktopColorClasses[2]} h-16 py-2 text-base`,
        `${baseClasses} ${desktopColorClasses[3]} h-16 py-2 text-base`,
      ]
    : [
        `${baseClasses} ${desktopColorClasses[0]} h-28 sm:h-12 md:h-16 py-6 sm:py-0 text-lg sm:text-base md:text-lg`,
        `${baseClasses} ${desktopColorClasses[1]} h-28 sm:h-12 md:h-16 py-6 sm:py-0 text-lg sm:text-base md:text-lg`,
        `${baseClasses} ${desktopColorClasses[2]} h-28 sm:h-12 md:h-16 py-6 sm:py-0 text-lg sm:text-base md:text-lg`,
        `${baseClasses} ${desktopColorClasses[3]} h-28 sm:h-12 md:h-16 py-6 sm:py-0 text-lg sm:text-base md:text-lg`,
      ];

  /**
   * Determine button classes based on index and selection state
   * Adds visual feedback (outline) for correct/incorrect selections
   */
  const getButtonClasses = (index) => {
    let classes = defaultClasses[index];
    
    // Add disabled state styling - but don't show "no" cursor when showing feedback
    if (disabled && !feedback) {
      classes += " opacity-70 cursor-not-allowed";
    } else if (disabled && feedback) {
      classes += " opacity-70"; // Disabled but showing feedback, so normal cursor
    }
    
    // Add selection feedback for user's choice
    if (selectedButtonIndex !== null && index === selectedButtonIndex) {
      classes += feedback === "correct"
        ? " ring-4 ring-green-500 ring-opacity-75 transform scale-105"
        : feedback === "incorrect"
        ? " ring-4 ring-red-500 ring-opacity-75 transform scale-105"
        : "";
    }
    
    // Add correct answer indicator (different style)
    if (correctAnswerButton !== null && index === correctAnswerButton && index !== selectedButtonIndex) {
      classes += " ring-4 ring-blue-500 ring-opacity-75 transform scale-105";
    }
    
    // Add time's up highlighting - enhanced for mobile visibility
    if (isTimeUp) {
      classes += " transform scale-[1.03] shadow-xl";
    }
    
    return classes;
  };

  // Icons for each action button
  const buttonIcons = [
    <svg key="down" className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
    </svg>,
    <svg key="neutral" className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14"></path>
    </svg>,
    <svg key="up" className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
    </svg>,
    <svg key="rocket" className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path>
    </svg>
  ];

  // Handler for button clicks
  const handleClick = (index) => {
    console.log(`Button clicked with index: ${index}`);
    if (onButtonClick && !disabled) {
      onButtonClick(index);
    }
  };

  return (
    <div className={`
      ${isCompact ? 'my-0 px-0' : 'my-2 sm:my-4 md:my-8 px-4 sm:px-4 md:px-8 lg:px-16'} 
      flex flex-col sm:flex-row justify-between 
      ${isCompact ? 'gap-1' : isTimeUp ? 'gap-3 sm:gap-3 md:gap-4' : 'gap-2 sm:gap-3'} 
      ${isTimeUp ? 'relative z-[40] p-2 sm:p-0 bg-black bg-opacity-20 sm:bg-opacity-0 rounded-md sm:rounded-none' : ''}
    `}>
      {actionButtons.map((action, index) => (
        <button
          key={index}
          className={`
            ${getButtonClasses(index)} 
            flex-1 
            ${isCompact ? 'mb-1' : isTimeUp ? 'mb-3 sm:mb-0 h-32 sm:h-28 md:h-16 py-6 sm:py-6 md:py-0 text-xl sm:text-lg md:text-lg' : 'mb-2 sm:mb-0'} 
            relative
            ${isTimeUp ? 'min-w-[80px]' : ''}
          `}
          onClick={() => handleClick(index)}
          disabled={disabled}
          data-index={index}
        >
          <div className="flex items-center justify-center">
            {buttonIcons[index]}
            <span>{action}</span>
          </div>
          {/* Keyboard shortcut indicator - hidden on mobile */}
          <div className="absolute top-1 right-1.5 bg-black bg-opacity-30 rounded-md px-1.5 py-0.5 text-xs opacity-80 hidden sm:block">
            {index + 1}
          </div>
        </button>
      ))}
    </div>
  );
});

export default ActionButtonsRow;
