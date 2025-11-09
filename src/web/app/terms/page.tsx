import React from 'react';

export default function TermsPage() {
  return (
    <div className="w-full flex justify-center">
      <div className="w-full sm:w-[90%] md:w-[85%] lg:w-[75%] max-w-[1400px] pt-8 pb-8">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-turquoise-200 via-white to-turquoise-200 bg-clip-text text-transparent mb-2">Terms of Service</h1>
          <p className="text-gray-300 mb-6">Effective date: {new Date().toLocaleDateString()}</p>

          <div className="bg-white/10 rounded-md border border-white/15 ring-1 ring-turquoise-300/30 backdrop-blur-md p-6 sm:p-8 text-white">
            <div className="space-y-5 text-base leading-relaxed">
              <p>By using Breakout Study Tool you agree to these Terms and our Privacy Policy. If you do not agree, do not use the Service.</p>
              <ul className="list-disc list-inside space-y-2 text-gray-200">
                <li>You must be at least 13 years old.</li>
                <li>Use the Service for personal, non‑commercial purposes only.</li>
                <li>Do not copy, reverse engineer, disrupt, or misuse the Service.</li>
                <li>The Service is educational only and not financial advice.</li>
                <li>The Service is provided “as is” without warranties of any kind.</li>
                <li>We are not liable for indirect or consequential damages as allowed by law.</li>
              </ul>
              <p>We may update these Terms and will adjust the effective date above. Continued use means you accept the changes.</p>
              <p>Questions? Contact <a href="mailto:evan_maus@berkeley.edu" className="text-turquoise-300 underline underline-offset-4">evan_maus@berkeley.edu</a>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
