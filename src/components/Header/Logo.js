import Link from "next/link";

/**
 * Logo Component
 * 
 * Displays the application logo with a link to the home page.
 * Features:
 * - Clean design representing a Qullamaggie breakout pattern
 * - Initial uptrend clearly connected to the wedge
 * - Properly oriented flag/pennant pattern narrowing to the right
 * - Breakout line perfectly parallel to initial uptrend
 * - All lines perfectly aligned and connected
 * - Thicker lines for better visibility
 * - Modern, professional appearance with icon and text
 * - Link to home page for easy navigation
 */
const Logo = () => {
  return (
    <Link href="/" className="flex items-center">
      <div className="flex items-center">
        {/* Logo Icon - Qullamaggie Breakout Pattern */}
        <div className="w-10 h-10 bg-gradient-to-r from-turquoise-700 to-turquoise-500 rounded-lg flex items-center justify-center shadow-md mr-3">
          {/* Qullamaggie breakout chart pattern - perfectly aligned */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Initial uptrend */}
            <polyline points="6,19 9,13" />
            
            {/* Pennant/wedge with clear connection to initial leg */}
            <polyline points="9,13 9,10" /> {/* Left vertical line up */}
            <polyline points="9,13 9,16" /> {/* Left vertical line down */}
            <polyline points="9,10 15,12" /> {/* Upper wedge line */}
            <polyline points="9,16 15,12" /> {/* Lower wedge line */}
            
            {/* Breakout parallel to initial uptrend */}
            <polyline points="15,12 18,6" />
          </svg>
        </div>
        
        {/* Logo Text */}
        <div className="flex flex-col">
          <span className="font-bold text-xl text-gray-800">Breakout Study Tool</span>
          <span className="text-xs text-gray-500">Learn to trade breakouts, efficiently</span>
        </div>
      </div>
    </Link>
  );
};

export default Logo;
