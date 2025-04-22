import Link from 'next/link';
import BackButton from '../components/BackButton';

/**
 * Custom 404 Not Found page
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800">404</h1>
        <h2 className="mt-4 text-2xl font-medium text-gray-700">Page Not Found</h2>
        <p className="mt-4 text-gray-600 max-w-lg">
          Sorry, we couldn't find the page you're looking for. The page might have been moved, 
          deleted, or perhaps the URL was mistyped.
        </p>
        
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link 
            href="/" 
            className="px-6 py-3 text-white font-medium bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </Link>
          
          <BackButton />
        </div>
      </div>
    </div>
  );
} 