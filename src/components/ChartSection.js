/**
 * ChartSection.js
 * 
 * Component for displaying stock charts in a responsive layout.
 * Features:
 * - Responsive design with different layouts for mobile and desktop
 * - Displays multiple charts (daily, hourly, minute) in an organized grid
 * - Shows timer and authentication controls
 * - Optimized with React.memo for performance
 * - Clean, borderless design with soft backgrounds for reduced eye strain
 */
import React from "react";
import StockChart from "./StockChart";
import AuthModal from "./AuthModal";
import ActionButtonsRow from "./ActionButtonsRow";

const ChartSection = React.memo(function ChartSection({
  orderedFiles,
  timer,
  pointsTextArray,
  actionButtons,
  selectedButtonIndex,
  feedback,
  onButtonClick,
  disabled,
}) {
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  // Timer color based on remaining time
  const getTimerColor = () => {
    if (timer <= 10) return "text-red-600";
    if (timer <= 30) return "text-yellow-600";
    return "text-turquoise-600";
  };

  return (
    <>
      {/* Authentication and timer controls for mobile view */}
      <div className="md:hidden w-full flex justify-between items-center px-3 py-2 bg-soft-white shadow-sm">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2 text-turquoise-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h2 className={`text-2xl font-bold ${getTimerColor()}`}>
            {timer}s
          </h2>
        </div>
      </div>
      
      <div className="flex flex-col pt-2 sm:pt-4 md:pt-8 px-2 sm:px-6 md:px-10 md:flex-row gap-3 md:gap-6 items-center md:items-start">
        {/* Daily chart section - primary chart */}
        <div className="w-full md:w-auto md:flex-1 flex flex-col items-center bg-soft-white rounded-lg shadow-md p-3 md:p-4">
          <div className="w-full text-center hidden md:block mb-2">
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2 text-turquoise-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h2 className={`text-xl font-bold ${getTimerColor()}`}>
                Timer: {timer}s
              </h2>
            </div>
          </div>
          <div className="w-full mt-1 sm:mt-2 relative aspect-square rounded-lg overflow-hidden shadow-sm">
            {/* D Label - positioned in the top left corner */}
            <div className="absolute top-0 left-0 text-white font-bold z-10 bg-gradient-turquoise px-2 py-1 rounded-br-md">
              D
            </div>
            <StockChart csvData={orderedFiles[0].data} />
          </div>
        </div>

        {/* Right Column: Second & Third Charts + Points Grid */}
        <div className="flex flex-col w-full md:flex-1 gap-3 md:gap-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Second Chart */}
            <div className="w-full sm:w-3/5 flex flex-col items-center bg-soft-white rounded-lg shadow-md p-3">
              <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-sm">
                {/* H Label - positioned in the top left corner */}
                <div className="absolute top-0 left-0 text-white font-bold z-10 bg-gradient-to-r from-turquoise-700 to-turquoise-600 px-2 py-1 rounded-br-md">
                  H
                </div>
                <StockChart csvData={orderedFiles[1].data} />
              </div>
            </div>
            {/* Third Chart - Hidden on mobile */}
            <div className="hidden sm:flex sm:w-2/5 flex-col items-center sm:items-end bg-soft-white rounded-lg shadow-md p-3">
              {showAuthModal && (
                <AuthModal
                  open={showAuthModal}
                  onClose={() => setShowAuthModal(false)}
                />
              )}
              <div className="w-full flex justify-center">
                <div className="w-full max-w-[300px] aspect-square relative rounded-lg overflow-hidden shadow-sm">
                  {/* M Label - positioned in the top left corner */}
                  <div className="absolute top-0 left-0 text-white font-bold z-10 bg-gradient-to-r from-turquoise-500 to-turquoise-400 px-2 py-1 rounded-br-md">
                    M
                  </div>
                  <StockChart csvData={orderedFiles[2].data} showSMA={false} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile-only: Minute Chart next to Points Text Blocks */}
          <div className="sm:hidden flex flex-row mt-2 gap-3">
            <div className="w-1/2 bg-soft-white rounded-lg shadow-md p-3">
              <div className="w-full aspect-square relative rounded-lg overflow-hidden shadow-sm">
                {/* M Label - positioned in the top left corner */}
                <div className="absolute top-0 left-0 text-white font-bold z-10 bg-gradient-to-r from-turquoise-500 to-turquoise-400 px-2 py-1 rounded-br-md">
                  M
                </div>
                <StockChart csvData={orderedFiles[2].data} showSMA={false} />
              </div>
            </div>
            <div className="w-1/2 bg-soft-white rounded-lg shadow-md p-3 flex items-center">
              <div className="w-full flex flex-col gap-2">
                {pointsTextArray.map((text, index) => (
                  <div
                    key={index}
                    className={`rounded-md shadow-sm p-2 text-center text-xs flex items-center justify-center min-h-[1.75rem] ${
                      text ? "bg-turquoise-600 text-white" : "invisible"
                    }`}
                  >
                    {text || "\u00A0"}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Points Grid - Hidden on mobile */}
          <div className="hidden sm:grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 px-1 sm:px-0 bg-soft-white rounded-lg shadow-md p-3">
            {pointsTextArray.map((text, index) => (
              <div
                key={index}
                className={`rounded-md shadow-sm p-2 text-center text-sm flex items-center justify-center min-h-[2rem] transition-all duration-200 ${
                  text ? "bg-turquoise-600 text-white hover:bg-turquoise-700" : "invisible"
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
