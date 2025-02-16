// src/components/NavigationButtons.js
import React from "react"

const NavigationButtons = React.memo(function NavigationButtons({
  onPrevious,
  onNext,
}) {
  return (
    <div className="mt-8 flex justify-center">
      <button
        onClick={onPrevious}
        className="px-6 py-3 bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition text-lg mx-2"
      >
        Previous
      </button>
      <button
        onClick={onNext}
        className="px-6 py-3 bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition text-lg mx-2"
      >
        Next
      </button>
    </div>
  )
})

export default NavigationButtons
