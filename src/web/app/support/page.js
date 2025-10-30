export default function SupportPage() {
  return (
    <div className="w-full flex justify-center">
      <div className="w-full sm:w-[90%] md:w-[70%] lg:w-[60%] max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-extrabold text-center bg-gradient-to-r from-turquoise-200 via-white to-turquoise-200 bg-clip-text text-transparent mb-6">
          Support
        </h1>
        <div className="bg-white/10 text-white px-8 py-10 rounded-2xl backdrop-blur-md border border-white/15 ring-1 ring-turquoise-300/30 shadow-[0_14px_40px_rgba(56,178,172,0.28)]">
          <p className="text-lg text-white/90 text-center">
            For any questions or issues, contact me at
            {' '}
            <a href="mailto:evan_maus@berkeley.edu" className="text-turquoise-300 hover:text-turquoise-200 underline underline-offset-4">
              evan_maus@berkeley.edu
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}