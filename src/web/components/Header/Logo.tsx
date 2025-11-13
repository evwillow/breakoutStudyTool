/**
 * @fileoverview Application logo component linking back to the homepage.
 * @module src/web/components/Header/Logo.tsx
 * @dependencies next/link
 */
import Link from "next/link";

interface LogoProps {
  scrolled?: boolean;
}

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
const Logo: React.FC<LogoProps> = ({ scrolled = false }) => {
  return (
    <Link href="/" className="flex items-center whitespace-nowrap">
      <div className="flex items-center">
        {/* Logo Icon - Qullamaggie Breakout Pattern */}
        <div className="w-9 h-9 bg-turquoise-500 rounded-lg flex items-center justify-center shadow-md mr-3 flex-shrink-0">
          {/* Qullamaggie breakout chart pattern - perfectly aligned */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Initial uptrend */}
            <polyline points="4,22 8,10" />
            
            {/* Pennant/wedge with clear connection to initial leg */}
            {/* Upper wedge */}
            <polyline points="8,10 15,12" strokeLinecap="butt" /> {/* Upper wedge line with flat caps */}
            {/* Lower wedge */}
            <polyline points="6,16 15,12" strokeLinecap="butt" /> {/* Lower wedge line with less steep angle */}
            
            {/* Breakout parallel to initial uptrend */}
            <polyline points="15,12 19,3" />
          </svg>
        </div>
        
        {/* Logo Text */}
        <div className="flex flex-col flex-shrink-0">
          <span className={`font-bold text-lg whitespace-nowrap ${scrolled ? "text-gray-800" : "text-white"}`}>Breakout Study Tool</span>
          <span className={`text-[11px] whitespace-nowrap ${scrolled ? "text-gray-500" : "text-white/70"}`}>Learn to trade breakouts, efficiently</span>
        </div>
      </div>
    </Link>
  );
};

export default Logo;

