/**
 * @fileoverview Learn page placeholder for educational resources gated by authentication.
 * @module src/web/app/learn/page.tsx
 * @dependencies React, @/lib/hooks/useAuthRedirect
 */
"use client";

import { useAuthRedirect } from "@/lib/hooks/useAuthRedirect";
import { UI_CONFIG } from "@/components/Flashcards/constants";

/**
 * Learn Page
 * 
 * Educational content and resources for learning breakout patterns.
 * Features:
 * - Tutorials and guides
 * - Pattern recognition tips
 * - Trading strategies
 */
export default function LearnPage() {
  const { session, isLoading, isAuthenticated } = useAuthRedirect();
  
  // Only show loading if truly loading and no session cookie exists
  // This allows instant navigation between pages
  if (isLoading) {
    return null;
  }
  
  // Only hide content if truly unauthenticated (redirect will happen)
  if (!isAuthenticated) return null;

  const categories = [
    {
      title: "Foundational Education",
      items: [
        { text: "Beginner Resources from KJ", url: "https://kj-gets-better.notion.site/5-Star-Resources-0a8adfab30de4e34b4594b7253cf7dbb" },
        { text: "Dr. Mansi's Strategy", url: "https://docs.google.com/document/d/1FnesYhTZiJvlVHRN6QFylbK6d50X6_0A/edit" },
      ],
    },
    {
      title: "Core Qullamaggie Resources",
      items: [
        { text: "Qullamaggie.net FAQ" },
        { text: "Qullamaggie.net Blog Posts" },
        { text: "Qullamaggie – all videos – transcripts", url: "https://www.scribd.com/document/748079660/All-Qullamaggie-streams-transcripts" },
        { text: "Qullamaggie 2017 Playlist", url: "https://youtube.com/playlist?list=PLlDXlLt-_6KG_ftEoI4vEuumLu5K4esdT&si=iEAz0W_KPFlO3Wl4" },
        { text: "Qullamaggie 2019 Playlist", url: "https://youtube.com/playlist?list=PLlDXlLt-_6KFmtCJU9w99Gz8mpRy49sfh&si=7ZWCvJdMs6A86D5N" },
        { text: "Qullamaggie 2020 Playlist", url: "https://youtube.com/playlist?list=PLlDXlLt-_6KHwKsGfVU0i2J56aQJmAN6H&si=pQ2zd_vGV_DY1PZc" },
        { text: "Qullamaggie 2021 Playlist", url: "https://youtube.com/playlist?list=PLlDXlLt-_6KFR3x7w6Ss8s4XWrHURGTxZ&si=3RLmhHHMGBROa0lr" },
        { text: "Qullamaggie's Laws of Swing from Scrutiniser, MikeC", url: "https://docs.google.com/document/d/1Ti8MxMnPFpUoGomUnaWMzcALtnRX2W0kyd3uYZ7d3Rc/edit?tab=t.0#heading=h.kwyflg25fktr" },
        { text: "20 Tweets from Qullamaggie Explaining Methods and Approach", url: "https://threadreaderapp.com/thread/1331881328082620417.html" },
      ],
    },
    {
      title: "Market Preparation & Daily Processes",
      items: [
        { text: "Daily preparation checklist", url: "https://docs.google.com/document/d/1ya8QSQBDta-5ZapO1IaOnaD6X80j3DXR/edit" },
        { text: "Relative Strength techniques", url: "https://drive.google.com/file/d/1LoqpuU9zu0FoYaJyY9qr__F9bHql7wUc/view" },
        { text: "Situational Awareness tool", url: "https://stockbee.blogspot.com/p/mm.html" },
        { text: "Result-Based Assumption Forecast", url: "https://docs.google.com/spreadsheets/d/1gDhIhMa05N-G-3uPbwAJY2z9GTpA617A/edit?gid=1146623243#gid=1146623243" },
        { text: "Execution curve if you use IB as broker", url: "https://github.com/aklepaker/traderui" },
      ],
    },
    {
      title: "Journaling & Review Tools",
      items: [
        { text: "Free trading Journal 1", url: "https://docs.google.com/spreadsheets/d/1UKpjpnaYe43rM1yA7hp_PfkXxPtuIhjNMeembEwJxog/edit?gid=0#gid=0" },
        { text: "Free trading Journal 2", url: "https://github.com/Eleven-Trading/TradeNote" },
        { text: "Free trading Journal 3", url: "https://drive.google.com/file/d/1kDdnd7ZS2GnoqMyMjIz_20NJGycacoRU/view" },
        { text: "Free trade review tool", url: "https://tradedetail.com/#/statistics" },
      ],
    },
    {
      title: "Technical Tools & Study Materials",
      subcategories: [
        {
          title: "Scans & Screeners",
          items: [
            { text: "ThinkScript compilation with indicators", url: "https://onedrive.live.com/view.aspx?resid=2FF733D1BA1E1E79!404&migratedtospo=true&redeem=aHR0cHM6Ly8xZHJ2Lm1zL3UvcyFBbmtlSHJyUk1fY3ZneFFUbDF4Y2tJTllsS2ha&wd=target%28Welcome.one%7Ca4f3f17e-e630-4d25-9b5b-ec957945a752%2F1.%20Introduction%20%20Usage%20%28updated%2004.27.%7C30461c4b-420e-4b83-b56f-55faf5d1461b%2F%29&wdorigin=NavigationUrl" },
          ],
        },
        {
          title: "Software Layouts & Data Tools",
          items: [
            { text: "Qullamaggie's TC2000 layout", url: "https://www.tc2000.com/share/qullamaggie/layout/04a0fd0d-fd6a-4218-9b51-d76589e2e15b" },
            { text: "Stream Recap Summaries", url: "https://fewmoredays.io/" },
            { text: "Marketsmith-like Earnings and Sales data from Huskychart", url: "https://github.com/huskytrader/corporate-earnings" },
          ],
        },
        {
          title: "Data Lists",
          items: [
            { text: "List of Parabolic Stocks 2020", url: "https://docs.google.com/spreadsheets/d/1n9FpL_S-mu4TmywLfAIQ1xWjEqYcokgbdAiu3Ocpv-0/edit?gid=0#gid=0" },
            { text: "1200 setups from hogtrades", url: "https://drive.google.com/file/d/1cymfgHXs4pozcfrdOcKxy34Q-Ood2C7g/view" },
          ],
        },
      ],
    },
    {
      title: "Swing Trading Strategies & Setups",
      subcategories: [
        {
          title: "Qullamaggie Methodology",
          items: [
            { text: "Qullamaggie's extensive study on $AMC (Case Study)", url: "https://drive.google.com/file/d/1Jlclom2lUMWkyptFukbdlEm1QV-Rk4o9/view" },
          ],
        },
        {
          title: "Books & PDFs",
          items: [
            { text: "Trade Like an O'Neil Disciple – Gil Morales & Chris Kacher", url: "https://drive.google.com/drive/u/1/folders/1M9FF0DgrgFunyNuZow66kpXqCOSeMdhM" },
            { text: "Secrets for Profiting in Bull and Bear Markets – Stan Weinstein", url: "https://drive.google.com/drive/u/1/folders/1M9FF0DgrgFunyNuZow66kpXqCOSeMdhM" },
            { text: "The Perfect Speculator – Brad Koteshwar", url: "https://drive.google.com/drive/u/1/folders/1M9FF0DgrgFunyNuZow66kpXqCOSeMdhM" },
            { text: "Trade Your Way to Financial Freedom – Van K. Tharp", url: "https://drive.google.com/drive/u/1/folders/1M9FF0DgrgFunyNuZow66kpXqCOSeMdhM" },
            { text: "Momentum Masters – Minervini, Ryan, Zanger, Ritchie II", url: "https://drive.google.com/drive/u/1/folders/1M9FF0DgrgFunyNuZow66kpXqCOSeMdhM" },
            { text: "Trading in the Zone – Mark Douglas", url: "https://drive.google.com/drive/u/1/folders/1M9FF0DgrgFunyNuZow66kpXqCOSeMdhM" },
            { text: "Market Wizards (series)", url: "https://drive.google.com/drive/u/1/folders/1dKnU_ZafcBQghzPC73nWDbPwxq8duQzI" },
            { text: "The Rule – Larry Hite", url: "https://drive.google.com/drive/u/1/folders/1M9FF0DgrgFunyNuZow66kpXqCOSeMdhM" },
          ],
        },
      ],
    },
    {
      title: "Video-Based Learning & Mentorship",
      subcategories: [
        {
          title: "YouTube Channels",
          items: [
            { text: "TraderLion", url: "https://www.youtube.com/@TraderLion" },
            { text: "Richard Moglen", url: "https://www.youtube.com/@RichardMoglen" },
            { text: "Mastertradingflow", url: "http://youtube.com/@mastertradingflow" },
            { text: "John Pocorobba", url: "https://www.youtube.com/@RainKingLLC" },
            { text: "Stockbee", url: "https://www.youtube.com/@Stockbeevideos" },
            { text: "Dr. Mansi", url: "https://www.youtube.com/@drmansipd" },
            { text: "Dr. Mansi Strategy Channel", url: "https://www.youtube.com/@DrManisStrategy" },
          ],
        },
        {
          title: "Streams",
          items: [
            { text: "Notes from Kristian Kullamägi's streams", url: "https://docs.google.com/document/d/1epvC7Lb3X1aYfdCw21L1BUNrdWwFNGXf4BTqYOKh0gk/edit?tab=t.0" },
          ],
        },
      ],
    },
    {
      title: "Master Trader Profiles (for deep study)",
      items: [
        { text: "William O'Neil", url: "https://en.wikipedia.org/wiki/William_O%27Neil" },
        { text: "Mark Minervini", url: "https://x.com/markminervini?lang=en" },
        { text: "David Ryan", url: "https://x.com/dryan310?lang=en" },
        { text: "Gil Morales", url: "https://x.com/gilmoreport?lang=en" },
        { text: "Chris Kacher", url: "https://de.wikipedia.org/wiki/Chris_Kacher" },
        { text: "Charles Harris", url: "https://x.com/chasharris1025?lang=en" },
        { text: "Joe Fahmy", url: "https://joefahmy.com/" },
        { text: "Eve Boboch", url: "https://x.com/EBoboch" },
        { text: "Mark Ritchie", url: "https://en.wikipedia.org/wiki/Mark_Ritchie_(trader)" },
      ],
    },
    {
      title: "Practical Tools & Calculators",
      items: [
        { text: "Kelly Criterion Calculator", url: "https://fical.net/en/kelly-criterion-calculator" },
        { text: "Compound Interest Calculator", url: "http://www.moneychimp.com/calculator/compound_interest_calculator.htm" },
        { text: "Equity Curve Simulator", url: "https://ayondo.com/en/tools/equity-curve-simulator" },
      ],
    },
  ];

  return (
    <div style={{ marginTop: UI_CONFIG.CONTAINER_MARGIN_TOP }}>
      <div className="min-h-screen w-full flex justify-center items-start p-0 sm:p-4 md:p-6">
        <div className="w-full sm:max-w-[1200px] bg-transparent rounded-md overflow-hidden py-8">
          <div className="w-full">
            <h1 className="text-4xl font-extrabold text-center bg-gradient-to-r from-turquoise-200 via-white to-turquoise-200 bg-clip-text text-transparent mb-16 pb-2 leading-tight">
              Trading Resources & Education
        </h1>
            <div className="bg-transparent text-white grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-10">
              {categories.map((category, categoryIndex) => {
                // Remove border for last section and second-to-last section (in 2-column grid)
                const isLastOrSecondToLast = categoryIndex >= categories.length - 2;
                return (
                <div
                  key={categoryIndex}
                  className={`pb-8 ${isLastOrSecondToLast ? '' : 'border-b border-white/10'}`}
                >
                  <h2 className="text-2xl font-bold text-turquoise-300 mb-4">
                    {category.title}
                  </h2>
                  {category.items ? (
                    <ul className="space-y-2 ml-4">
                      {category.items.map((item, itemIndex) => {
                        const itemText = typeof item === 'string' ? item : item.text;
                        const itemUrl = typeof item === 'object' ? item.url : null;
                        return (
                          <li
                            key={itemIndex}
                            className="text-white/90 text-base leading-relaxed"
                          >
                            {itemUrl ? (
                              <a
                                href={itemUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white/90 hover:text-turquoise-300 hover:underline underline-offset-2 transition-colors duration-200"
                              >
                                {itemText}
                              </a>
                            ) : (
                              itemText
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="space-y-6 ml-4">
                      {category.subcategories?.map(
                        (subcategory, subIndex) => (
                          <div key={subIndex} className="space-y-3">
                            <h3 className="text-xl font-semibold text-turquoise-200/90">
                              {subcategory.title}
                            </h3>
                            <ul className="space-y-2 ml-4">
                              {subcategory.items.map((item, itemIndex) => {
                                const itemText = typeof item === 'string' ? item : item.text;
                                const itemUrl = typeof item === 'object' ? item.url : null;
                                return (
                                  <li
                                    key={itemIndex}
                                    className="text-white/90 text-base leading-relaxed"
                                  >
                                    {itemUrl ? (
                                      <a
                                        href={itemUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-white/90 hover:text-turquoise-300 hover:underline underline-offset-2 transition-colors duration-200"
                                      >
                                        {itemText}
                                      </a>
                                    ) : (
                                      itemText
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
