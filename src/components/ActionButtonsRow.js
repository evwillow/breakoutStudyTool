// /src/components/ActionButtonsRow.js
import React from "react";

const ActionButtonsRow = React.memo(function ActionButtonsRow({
  actionButtons,
  selectedButtonIndex = null,
  feedback = null,
  onButtonClick,
  disabled = false,
}) {
  const defaultClasses = [
    "w-24 h-24 bg-red-400 text-black border border-black rounded shadow-lg flex items-center justify-center text-xs",
    "mt-7 w-24 h-24 bg-yellow-400 text-black border border-black rounded shadow-lg flex items-center justify-center text-xs",
    "mt-7 w-24 h-24 bg-lime-400 text-black border border-black rounded shadow-lg flex items-center justify-center text-xs",
    "w-24 h-24 bg-green-400 text-black border border-black rounded shadow-lg flex items-center justify-center text-xs",
  ];

  const getButtonClasses = (index) => {
    let classes = defaultClasses[index];
    if (selectedButtonIndex !== null && index === selectedButtonIndex) {
      classes += feedback === "correct"
        ? " outline outline-4 outline-green-500"
        : feedback === "incorrect"
        ? " outline outline-4 outline-red-500"
        : "";
    }
    return classes;
  };

  return (
    <div className="my-8 px-48 flex justify-around">
      {actionButtons.map((action, index) => (
        <button
          key={index}
          className={getButtonClasses(index)}
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
