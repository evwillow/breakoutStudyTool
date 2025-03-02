// /src/components/ActionButtonsRow.js
import React from "react";

const ActionButtonsRow = React.memo(function ActionButtonsRow({
  actionButtons,
  selectedButtonIndex = null,
  feedback = null,
  onButtonClick,
  disabled = false,
}) {
  // Base classes for all screen sizes
  const baseClasses = "border-2 border-gray-800 rounded-md shadow-lg flex items-center justify-center font-medium";
  
  // Desktop-specific classes that we'll maintain across all breakpoints
  const desktopColorClasses = [
    "bg-red-500",
    "bg-yellow-500", 
    "bg-lime-500",
    "bg-green-600"
  ];
  
  // Responsive classes that adapt to screen size
  const defaultClasses = [
    `${baseClasses} ${desktopColorClasses[0]} text-black h-9 sm:h-12 md:h-16 text-sm sm:text-base md:text-lg`,
    `${baseClasses} ${desktopColorClasses[1]} text-black h-9 sm:h-12 md:h-16 text-sm sm:text-base md:text-lg`,
    `${baseClasses} ${desktopColorClasses[2]} text-black h-9 sm:h-12 md:h-16 text-sm sm:text-base md:text-lg`,
    `${baseClasses} ${desktopColorClasses[3]} text-black h-9 sm:h-12 md:h-16 text-sm sm:text-base md:text-lg`,
  ];

  const getButtonClasses = (index) => {
    let classes = defaultClasses[index];
    if (selectedButtonIndex !== null && index === selectedButtonIndex) {
      classes += feedback === "correct"
        ? " outline outline-2 sm:outline-3 md:outline-4 outline-green-500"
        : feedback === "incorrect"
        ? " outline outline-2 sm:outline-3 md:outline-4 outline-red-500"
        : "";
    }
    return classes;
  };

  return (
    <div className="my-1 sm:my-4 md:my-8 px-0 sm:px-4 md:px-8 lg:px-16 flex flex-col sm:flex-row justify-between gap-1 sm:gap-3">
      {actionButtons.map((action, index) => (
        <button
          key={index}
          className={`${getButtonClasses(index)} flex-1 mb-1 sm:mb-0`}
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
