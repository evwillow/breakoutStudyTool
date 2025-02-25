// src/components/ChartSection.js
import React, { useState } from "react";
import StockChart from "./StockChart";
import AuthButtons from "./AuthButtons";
import AuthModal from "./AuthModal";

const ChartSection = React.memo(function ChartSection({
  orderedFiles,
  timer,
  pointsTextArray,
}) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="flex flex-col pt-10 px-10 md:flex-row gap-4 w-full items-start">
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
          {/* Third Chart (M, no SMA) with auth UI above */}
          <div
            style={{ flexBasis: `${(6 / 14) * 100}%` }}
            className="flex flex-col items-end"
          >
            {/* Auth UI as a block element */}
            <div className="w-full pb-6 flex justify-end gap-2">
              <AuthButtons onSignIn={() => setShowAuthModal(true)} />
            </div>
            {showAuthModal && (
              <AuthModal
                open={showAuthModal}
                onClose={() => setShowAuthModal(false)}
              />
            )}
            <div className="w-full flex justify-center">
              <div className="w-full max-w-[300px] aspect-square relative">
                <div className="absolute -top-4 left-0 text-xs text-black">M</div>
                <StockChart csvData={orderedFiles[2].data} showSMA={false} />
              </div>
            </div>
          </div>
        </div>

        {/* Points Grid */}
        <div className="grid grid-cols-4 gap-6">
          {Array.from({ length: 8 }, (_, index) => {
            const text = pointsTextArray[index];
            return (
              <div
                key={index}
                className={`rounded shadow p-1 text-center text-xs flex items-center justify-center ${
                  text ? "bg-gray-300 text-black" : "invisible"
                }`}
              >
                {text || "\u00A0"}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default ChartSection;
