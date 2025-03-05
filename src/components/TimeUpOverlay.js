/**
 * TimeUpOverlay.js
 * 
 * Component that displays when time's up, blurring the background and forcing
 * the user to make a selection by highlighting the action buttons.
 * Features:
 * - Fixed position overlay that darkens and blurs the background
 * - Scrolls to and highlights the action buttons
 * - Prevents scrolling of the page until a selection is made
 * - Responsive design that works on all screen sizes
 * - Smooth transitions and animations for better user experience
 */
import React, { useEffect, useRef } from "react";

/**
 * TimeUpOverlay displays a darkened, blurred overlay with a message
 * and highlights the action buttons for selection
 * 
 * @param {Function} onSelect - Callback function that receives the selected option value
 * @param {Array} actionButtons - Array of action button labels
 * @param {Function} scrollToRef - Ref to scroll to (action buttons section)
 */
const TimeUpOverlay = ({ actionButtons, onSelect, actionButtonsRef }) => {
  // Ref for the overlay element
  const overlayRef = useRef(null);

  // Prevent scrolling when overlay is active and scroll to action buttons
  useEffect(() => {
    // Save the current body overflow style
    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    // Function to vertically center the action buttons in the viewport
    const centerButtonsVertically = () => {
      if (actionButtonsRef && actionButtonsRef.current) {
        // Get the button container's position information
        const buttonRect = actionButtonsRef.current.getBoundingClientRect();
        
        // Calculate the scroll position needed to center the buttons vertically
        const viewportHeight = window.innerHeight;
        const targetScrollPosition = window.pageYOffset + buttonRect.top - (viewportHeight / 2) + (buttonRect.height / 2);
        
        // Scroll to center the buttons
        window.scrollTo({
          top: targetScrollPosition,
          behavior: 'smooth'
        });
        
        // Highlight the buttons
        const buttons = actionButtonsRef.current.querySelectorAll('button');
        buttons.forEach(button => {
          button.style.transition = 'all 0.3s ease-in-out';
          button.classList.add('shadow-lg', 'z-[60]');
          button.style.transform = 'scale(1.05)';
          button.style.margin = '0 4px';
        });
        
        // Add a subtle highlight to the button container
        actionButtonsRef.current.style.transition = 'all 0.3s ease-in-out';
        actionButtonsRef.current.style.padding = '12px 8px';
        actionButtonsRef.current.style.backgroundColor = 'rgba(45, 212, 191, 0.1)';
        actionButtonsRef.current.style.borderRadius = '8px';
      }
    };
    
    // Prevent scrolling
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    
    // Initial centering - first immediate scroll then smooth adjustment
    setTimeout(() => {
      // First do an immediate scroll to get close
      if (actionButtonsRef && actionButtonsRef.current) {
        const buttonRect = actionButtonsRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const targetPosition = window.pageYOffset + buttonRect.top - (viewportHeight / 2) + (buttonRect.height / 2);
        
        // Immediate scroll first
        window.scrollTo(0, targetPosition);
        
        // Then smooth scroll for fine adjustment
        setTimeout(centerButtonsVertically, 50);
      }
    }, 100);
    
    // Set up a periodic check to ensure buttons stay centered
    const centerCheckInterval = setInterval(centerButtonsVertically, 1000);
    
    // Also recenter on window resize
    window.addEventListener('resize', centerButtonsVertically);
    
    // Cleanup function
    return () => {
      clearInterval(centerCheckInterval);
      window.removeEventListener('resize', centerButtonsVertically);
      
      // Remove button highlights
      if (actionButtonsRef && actionButtonsRef.current) {
        const buttons = actionButtonsRef.current.querySelectorAll('button');
        buttons.forEach(button => {
          button.style.transition = '';
          button.classList.remove('shadow-lg', 'z-[60]');
          button.style.transform = '';
          button.style.margin = '';
        });
        
        // Remove container highlight
        actionButtonsRef.current.style.transition = '';
        actionButtonsRef.current.style.padding = '';
        actionButtonsRef.current.style.backgroundColor = '';
        actionButtonsRef.current.style.borderRadius = '';
      }
      
      // Restore original styles
      document.body.style.overflow = originalStyle;
      document.documentElement.style.overflow = '';
      
      // Restore original scroll position
      window.scrollTo(0, originalPosition);
    };
  }, [actionButtonsRef]);

  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-md z-50 flex flex-col items-center justify-start pt-20 transition-opacity duration-500 ease-in-out overflow-hidden"
    >
      {/* Time's Up message - all white, single line */}
      <div className="message-container text-center px-4 transition-all duration-500">
        <div className="flex items-center justify-center">
          <svg className="w-10 h-10 mr-3 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span className="text-white font-bold text-2xl sm:text-3xl whitespace-nowrap">
            Time's Up! Make a selection below
          </span>
        </div>
      </div>
      
      {/* Directional arrow pointing to buttons with enhanced animation */}
      <div className="arrow-container mt-8 mb-8 text-turquoise-500 animate-bounce transition-transform duration-300">
        <svg className="w-16 h-16 drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
        </svg>
      </div>
      
      {/* Subtle highlight for the action buttons area */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-turquoise-500/20 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default TimeUpOverlay; 