export default function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6 text-center">Support</h1>
      
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4">How can we help you?</h2>
        
        <p className="mb-4">
          If you're experiencing any issues with the application or have questions,
          please don't hesitate to reach out to our support team.
        </p>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium text-lg mb-2">Contact Information</h3>
          <p>Email: support@breakoutstudytool.com</p>
          <p>Phone: (555) 123-4567</p>
          <p>Hours: Monday-Friday, 9am-5pm EST</p>
        </div>
        
        <div className="mb-6">
          <h3 className="font-medium text-lg mb-2">Frequently Asked Questions</h3>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium">How do I reset my password?</h4>
              <p className="text-gray-600">You can reset your password by clicking on the "Forgot Password" link on the sign-in page.</p>
            </div>
            <div>
              <h4 className="font-medium">Can I use the app offline?</h4>
              <p className="text-gray-600">Currently, our application requires an internet connection to function properly.</p>
            </div>
            <div>
              <h4 className="font-medium">How do I create custom study materials?</h4>
              <p className="text-gray-600">Navigate to the Dashboard and click on "Create New" to start creating your custom study materials.</p>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="font-medium text-lg mb-2">Submit a Support Ticket</h3>
          <p className="text-gray-600 mb-4">
            For more specific issues, please submit a support ticket and our team will get back to you within 24 hours.
          </p>
          <button className="bg-turquoise-600 text-white py-2 px-4 rounded hover:bg-turquoise-700 transition-colors">
            Create Support Ticket
          </button>
        </div>
      </div>
    </div>
  );
} 