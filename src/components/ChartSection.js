// src/components/ChartSection.js
import React from "react"
import StockChart from "./StockChart"

const ChartSection = React.memo(function ChartSection({
  orderedFiles,
  timer,
  pointsTextArray,
}) {
  return (
    <div className="flex flex-col md:flex-row gap-4 w-full items-start">
      {/* First Chart Column (Timer + D) */}
      <div
        style={{ flexBasis: `${(10 / 26) * 100}%` }}
        className="flex flex-col items-center"
      >
        <div className="w-full text-center">
          <h2 className="text-lg font-bold text-black">Timer: {timer}s</h2>
        </div>
        <div className="w-full mt-6 relative">
          <div className="absolute -top-4 left-0 text-xs text-black">D</div>
          <StockChart csvData={orderedFiles[0].data} />
        </div>
      </div>

      {/* Second and Third Charts */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-row gap-7">
          {/* Second Chart (H) */}
          <div
            style={{ flexBasis: `${(8 / 14) * 100}%` }}
            className="flex flex-col items-center"
          >
            <div className="relative w-full">
              <div className="absolute -top-4 left-0 text-xs text-black">H</div>
              <StockChart csvData={orderedFiles[1].data} />
            </div>
          </div>
          {/* Third Chart (M, no SMA) */}
          <div
            style={{ flexBasis: `${(6 / 14) * 100}%` }}
            className="flex flex-col items-end"
          >
            <div className="pb-6 flex justify-end gap-2 w-full">
              <button className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow">
                Sign In
              </button>
              <button className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow">
                Sign Out
              </button>
            </div>
            <div className="w-full flex justify-center">
              <div className="w-full max-w-[300px] aspect-square relative">
                <div className="absolute -top-4 left-0 text-xs text-black">
                  M
                </div>
                <StockChart csvData={orderedFiles[2].data} showSMA={false} />
              </div>
            </div>
          </div>
        </div>

        {/* Points Grid */}
        <div className="grid grid-cols-4 gap-6">
          {pointsTextArray.map((text, index) => (
            <div
              key={index}
              className="bg-gray-300 text-black rounded shadow p-1 text-center text-xs"
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

export default ChartSection
