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
 */
import React from "react";

const ActionButtonsRow = React.memo(function ActionButtonsRow({
  actionButtons,
  selectedButtonIndex = null,
  feedback = null,
  onButtonClick,
  disabled = false,
  isCompact = false
}) {
  // Base styling for all buttons
  const baseClasses = "border-2 border-gray-800 rounded-md shadow-lg flex items-center justify-center font-medium";
  
  // Color scheme for the different action buttons
  const desktopColorClasses = [
    "bg-red-500",    // Negative action (e.g., -5%)
    "bg-yellow-500", // Neutral action (e.g., 0%)
    "bg-lime-500",   // Positive action (e.g., 20%)
    "bg-green-600"   // Strong positive action (e.g., 50%)
  ];
  
  // Responsive classes with different sizing based on screen size and compact mode
  const defaultClasses = isCompact 
    ? [
        `${baseClasses} ${desktopColorClasses[0]} text-black h-16 py-2 text-base`,
        `${baseClasses} ${desktopColorClasses[1]} text-black h-16 py-2 text-base`,
        `${baseClasses} ${desktopColorClasses[2]} text-black h-16 py-2 text-base`,
        `${baseClasses} ${desktopColorClasses[3]} text-black h-16 py-2 text-base`,
      ]
    : [
        `${baseClasses} ${desktopColorClasses[0]} text-black h-28 sm:h-12 md:h-16 py-6 sm:py-0 text-lg sm:text-base md:text-lg`,
        `${baseClasses} ${desktopColorClasses[1]} text-black h-28 sm:h-12 md:h-16 py-6 sm:py-0 text-lg sm:text-base md:text-lg`,
        `${baseClasses} ${desktopColorClasses[2]} text-black h-28 sm:h-12 md:h-16 py-6 sm:py-0 text-lg sm:text-base md:text-lg`,
        `${baseClasses} ${desktopColorClasses[3]} text-black h-28 sm:h-12 md:h-16 py-6 sm:py-0 text-lg sm:text-base md:text-lg`,
      ];

  /**
   * Determine button classes based on index and selection state
   * Adds visual feedback (outline) for correct/incorrect selections
   */
  const getButtonClasses = (index) => {
    let classes = defaultClasses[index];
    if (selectedButtonIndex !== null && index === selectedButtonIndex) {
      classes += feedback === "correct"
        ? " outline outline-2 outline-green-500"
        : feedback === "incorrect"
        ? " outline outline-2 outline-red-500"
        : "";
    }
    return classes;
  };

  return (
    <div className={`${isCompact ? 'my-0 px-0' : 'my-2 sm:my-4 md:my-8 px-4 sm:px-4 md:px-8 lg:px-16'} flex flex-col sm:flex-row justify-between ${isCompact ? 'gap-1' : 'gap-2 sm:gap-3'}`}>
      {actionButtons.map((action, index) => (
        <button
          key={index}
          className={`${getButtonClasses(index)} flex-1 ${isCompact ? 'mb-1' : 'mb-2 sm:mb-0'}`}
          onClick={() => onButtonClick(index + 1)}
          disabled={disabled}
        >
          {action}
        </button>
      ))}
    </div>
  );
});

export default ActionButtonsRow;
