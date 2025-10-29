import { StockDataDiagnostic } from "@/components";

export const metadata = {
  title: 'Stock Data Diagnostic',
  description: 'Diagnose and fix stock data access issues',
};

export default function StockDataDiagnosticPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold text-center mb-6">Stock Data Diagnostic</h1>
      <p className="text-center mb-6 max-w-lg mx-auto text-gray-600">
        This page helps diagnose issues with stock data access. If you're seeing "No Data Available"
        when trying to use this app, this tool will help you identify and fix the problem.
      </p>
      <StockDataDiagnostic />
    </div>
  );
} 