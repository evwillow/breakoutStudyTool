import React, { useEffect, useState } from 'react';
import { StockChart } from '../components';

export default function TestHourly() {
  const [hourlyData, setHourlyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/data/h.json');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        setHourlyData(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Loading chart data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-white text-2xl font-bold mb-4">Hourly Chart with 10, 20, and 50 SMAs</h1>
        
        <div className="bg-black border border-gray-700 rounded-lg p-4 h-[600px]">
          {hourlyData ? (
            <StockChart 
              data={hourlyData} 
              chartType="hourly"
              showSMA={true}
              forceShowSMA={true}
              backgroundColor="black"
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-white">No data available</p>
            </div>
          )}
        </div>

        <div className="mt-6 text-white">
          <h2 className="text-xl font-semibold mb-2">SMA Legend</h2>
          <div className="flex gap-6">
            <div className="flex items-center">
              <div className="w-4 h-1 bg-[#FF9500] mr-2"></div>
              <span>10 SMA</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-1 bg-[#00BFA5] mr-2"></div>
              <span>20 SMA</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-1 bg-[#FFEB3B] mr-2"></div>
              <span>50 SMA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 