import Link from "next/link";

/**
 * Logo Component
 * 
 * Displays the application logo with a link to the home page.
 * Features:
 * - Responsive design that adapts to different screen sizes
 * - Modern, professional appearance with icon and text
 * - Link to home page for easy navigation
 */
const Logo = () => {
  return (
    <Link href="/" className="flex items-center">
      <div className="flex items-center">
        {/* Logo Icon */}
        <div className="w-10 h-10 bg-gradient-to-r from-turquoise-600 to-turquoise-400 rounded-lg flex items-center justify-center shadow-md mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        
        {/* Logo Text */}
        <div className="flex flex-col">
          <span className="font-bold text-xl text-gray-800">BreakoutPro</span>
          <span className="text-xs text-gray-500">Master the Markets</span>
        </div>
      </div>
    </Link>
  );
};

export default Logo;
