// src/components/ActionButtonsRow.js
import React from "react"

const ActionButtonsRow = React.memo(function ActionButtonsRow({
  actionButtons,
  // Optional: an array of custom className strings for buttons 0-3
  customButtonClassNames = [],
}) {
  // Default class configurations for each index
  const defaultClasses = [
    "w-24 h-24 bg-red-400 text-black border border-black rounded shadow-lg flex items-center justify-center text-xs",
    "mt-7 w-24 h-24 bg-yellow-400 text-black border border-black rounded shadow-lg flex items-center justify-center text-xs",
    "mt-7 w-24 h-24 bg-lime-400 text-black border border-black rounded shadow-lg flex items-center justify-center text-xs",
    "w-24 h-24 bg-green-400 text-black border border-black rounded shadow-lg flex items-center justify-center text-xs",
  ];

  return (
    <div className="my-8 px-48 flex justify-around">
      {actionButtons.map((action, index) => {
        // Use the custom className if provided, else fallback to the default, 
        // or use a general fallback if index is outside our defaults.
        const className =
          customButtonClassNames[index] ||
          defaultClasses[index] ||
          "w-24 h-24 bg-gray-300 text-black border border-black rounded shadow-lg flex items-center justify-center text-xs";

        return (
          <button
            key={index}
            className={className}
            onClick={() => console.log(`Button ${index + 1} clicked: ${action}`)}
          >
            {action}
          </button>
        );
      })}
    </div>
  );
});

export default ActionButtonsRow;
