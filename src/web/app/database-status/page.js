import { DatabaseStatus } from "@/components";

export const metadata = {
  title: 'Database Status',
  description: 'Check the status of the database connection',
};

export default function DatabaseStatusPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold text-center mb-6">Database Status</h1>
      <p className="text-center mb-6 max-w-lg mx-auto text-gray-600">
        This page helps diagnose database connection issues. If you're experiencing problems with
        signing up or logging in, check the database status below.
      </p>
      <DatabaseStatus />
    </div>
  );
} 