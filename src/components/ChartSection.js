// /src/components/ChartSection.js
import React from "react";
import StockChart from "./StockChart";
import AuthButtons from "./AuthButtons";
import AuthModal from "./AuthModal";

const ChartSection = React.memo(function ChartSection({
  orderedFiles,
  timer,
  pointsTextArray,
}) {
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  return (
    <>
      {/* Mobile-only Auth Buttons at top */}
      <div className="md:hidden w-full flex justify-end px-2 py-1 border-b border-gray-200">
        <AuthButtons onSignIn={() => setShowAuthModal(true)} />
      </div>
      
      <div className="flex flex-col pt-1 sm:pt-4 md:pt-10 px-0 sm:px-6 md:px-10 md:flex-row gap-1 md:gap-4 w-full items-center md:items-start">
        {/* Left Column: Timer + First Chart */}
        <div
          className="w-full md:w-auto md:flex-1 flex flex-col items-center"
        >
          <div className="w-full text-center">
            <h2 className="text-sm sm:text-lg font-bold text-black">Timer: {timer}s</h2>
          </div>
          <div className="w-full mt-1 sm:mt-3 md:mt-6 relative aspect-[2/1]">
            {/* D Label - positioned in the top left corner */}
            <div className="absolute top-0 left-0 text-white font-bold z-50 bg-black bg-opacity-50 px-1">
              D
            </div>
            <StockChart csvData={orderedFiles[0].data} />
          </div>
        </div>

        {/* Right Column: Second & Third Charts + Points Grid */}
        <div className="flex flex-col w-full md:flex-1 gap-1 md:gap-4">
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-7">
            {/* Second Chart */}
            <div
              className="w-full sm:w-3/5 flex flex-col items-center"
            >
              <div className="relative w-full aspect-[2/1]">
                {/* H Label - positioned in the top left corner */}
                <div className="absolute top-0 left-0 text-white font-bold z-50 bg-black bg-opacity-50 px-1">
                  H
                </div>
                <StockChart csvData={orderedFiles[1].data} />
              </div>
            </div>
            {/* Third Chart with Auth Buttons */}
            <div
              className="w-full sm:w-2/5 flex flex-col items-center sm:items-end"
            >
              {/* Desktop-only Auth Buttons */}
              <div className="hidden md:flex w-full pb-2 sm:pb-6 justify-end gap-2">
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
                  {/* M Label - positioned in the top left corner */}
                  <div className="absolute top-0 left-0 text-white font-bold z-50 bg-black bg-opacity-50 px-1">
                    M
                  </div>
                  <StockChart csvData={orderedFiles[2].data} showSMA={false} />
                </div>
              </div>
            </div>
          </div>
          {/* Points Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 sm:gap-4 md:gap-6 px-1 sm:px-0">
            {pointsTextArray.map((text, index) => (
              <div
                key={index}
                className={`rounded shadow p-1 text-center text-xs flex items-center justify-center min-h-[1rem] sm:min-h-[2rem] ${
                  text ? "bg-gray-300 text-black" : "invisible"
                }`}
              >
                {text || "\u00A0"}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
});

export default ChartSection;
