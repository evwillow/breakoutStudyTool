"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function StockChart({ csvData }) {
  if (!csvData || typeof csvData !== 'string') {
    return <div className="h-60 flex items-center justify-center">No data available</div>;
  }

  const parseCSV = (csvString) => {
    try {
      const lines = csvString.trim().split('\n');
      if (lines.length < 2) return [];

      const headers = lines[0].toLowerCase().split(',');
      const closeIndex = headers.findIndex(h => h.includes('close'));
      const volumeIndex = headers.findIndex(h => h.includes('volume'));

      return lines.slice(1).map(line => {
        const values = line.split(',');
        return {
          date: values[0],
          price: parseFloat(values[closeIndex]) || 0,
          volume: parseFloat(values[volumeIndex]) || 0
        };
      }).filter(item => !isNaN(item.price) && !isNaN(item.volume));
    } catch (error) {
      console.error('Error parsing CSV:', error);
      return [];
    }
  };

  const chartData = parseCSV(csvData);

  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="price" stroke="#2563eb" name="Price" dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="volume" stroke="#16a34a" name="Volume" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
