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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg text-center">
        <h2 className="text-xl mb-4 text-black">
          Time is up! Make a selection:
        </h2>
        <div className="flex justify-around">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400 transition"
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
