// /src/components/Popup.js
import React from "react";

const Popup = ({ onSelect }) => {
  const options = [
    { label: "-5%", value: 1 },
    { label: "0%", value: 2 },
    { label: "20%", value: 3 },
    { label: "50%", value: 4 },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-1 sm:p-3 md:p-4">
      <div className="bg-white p-3 sm:p-4 md:p-6 rounded shadow-lg text-center w-[95%] sm:w-auto sm:max-w-sm">
        <h2 className="text-base sm:text-lg md:text-xl mb-2 sm:mb-3 md:mb-4 text-black">
          Time is up! Make a selection:
        </h2>
        <div className="flex flex-col sm:flex-row justify-around gap-1 sm:gap-2 md:gap-3">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className="px-2 sm:px-3 md:px-4 py-1 sm:py-2 bg-gray-300 text-black rounded hover:bg-gray-400 transition text-xs sm:text-sm md:text-base"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Popup;
