// src/components/ActionButtonsRow.js
import React from "react"

const ActionButtonsRow = React.memo(function ActionButtonsRow({
  actionButtons,
}) {
  return (
    <div className="my-8 flex justify-around">
      {actionButtons.map((action, index) => (
        <button
          key={index}
          className="w-24 h-24 bg-gray-300 text-black border border-black rounded shadow-lg flex items-center justify-center text-xs"
        >
          {action}
        </button>
      ))}
    </div>
  )
})

export default ActionButtonsRow
