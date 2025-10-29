export default function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-center text-turquoise-400">Support Center</h1>
      
      <div className="max-w-3xl mx-auto bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-800">
        <h2 className="text-2xl font-semibold mb-6 text-white">How can we help you?</h2>
        
        <p className="mb-6 text-gray-300 text-lg">
          If you're experiencing any issues with the application or have questions,
          please don't hesitate to reach out to our support team.
        </p>
        
        <div className="bg-gray-800 p-6 rounded-lg mb-8 border-l-4 border-turquoise-500">
          <h3 className="font-medium text-xl mb-4 text-turquoise-300">Contact Information</h3>
          <p className="text-white mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-turquoise-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Email: <a href="mailto:support@breakoutstudytool.com" className="text-turquoise-400 hover:underline">support@breakoutstudytool.com</a></span>
          </p>
          <p className="text-white mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-turquoise-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>Phone: (555) 123-4567</span>
          </p>
          <p className="text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-turquoise-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Hours: Monday-Friday, 9am-5pm EST</span>
          </p>
        </div>
        
        <div className="mb-8">
          <h3 className="font-medium text-xl mb-4 text-turquoise-300">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div className="bg-gray-800 p-4 rounded-lg border-l-2 border-turquoise-500">
              <h4 className="font-medium text-white mb-2">How do I reset my password?</h4>
              <p className="text-gray-300">You can reset your password by clicking on the "Forgot Password" link on the sign-in page. You'll receive an email with instructions to create a new password.</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border-l-2 border-turquoise-500">
              <h4 className="font-medium text-white mb-2">Can I use the app offline?</h4>
              <p className="text-gray-300">Currently, our application requires an internet connection to function properly. We're exploring offline capabilities for a future update.</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border-l-2 border-turquoise-500">
              <h4 className="font-medium text-white mb-2">How do I create custom study materials?</h4>
              <p className="text-gray-300">Navigate to the Dashboard and click on "Create New" to start creating your custom study materials. Our intuitive editor allows you to customize every aspect of your study sessions.</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="font-medium text-xl mb-3 text-turquoise-300">Submit a Support Ticket</h3>
          <p className="text-gray-300 mb-5">
            For more specific issues, please submit a support ticket and our team will get back to you within 24 hours.
          </p>
          <button className="bg-gradient-to-r from-turquoise-600 to-turquoise-500 text-white py-3 px-6 rounded-lg hover:from-turquoise-700 hover:to-turquoise-600 transition-all duration-300 shadow-lg font-medium flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            Create Support Ticket
          </button>
        </div>
      </div>
    </div>
  );
} 