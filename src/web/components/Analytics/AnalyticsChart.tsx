/**
 * Analytics Chart Components
 *
 * Enhanced chart components using Recharts for better visualizations.
 */

'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface ChartProps {
  data: { label: string; value: number; [key: string]: any }[];
  title: string;
  color?: string;
}

const colorPalette = {
  turquoise: {
    primary: '#06b6d4',
    light: '#22d3ee',
    dark: '#0891b2',
    gradient: ['#06b6d4', '#0891b2'],
  },
  green: {
    primary: '#10b981',
    light: '#34d399',
    dark: '#059669',
    gradient: ['#10b981', '#059669'],
  },
  blue: {
    primary: '#3b82f6',
    light: '#60a5fa',
    dark: '#2563eb',
    gradient: ['#3b82f6', '#2563eb'],
  },
  purple: {
    primary: '#8b5cf6',
    light: '#a78bfa',
    dark: '#7c3aed',
    gradient: ['#8b5cf6', '#7c3aed'],
  },
  pink: {
    primary: '#ec4899',
    light: '#f472b6',
    dark: '#db2777',
    gradient: ['#ec4899', '#db2777'],
  },
  yellow: {
    primary: '#eab308',
    light: '#facc15',
    dark: '#ca8a04',
    gradient: ['#eab308', '#ca8a04'],
  },
  red: {
    primary: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
    gradient: ['#ef4444', '#dc2626'],
  },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg p-3 shadow-xl">
        <p className="text-white/90 font-semibold mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name || 'Value'}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function BarChart({ data, title, color = 'turquoise' }: ChartProps) {
  const colors = colorPalette[color as keyof typeof colorPalette] || colorPalette.turquoise;
  const chartData = data.map((item) => ({
    name: item.label,
    value: item.value,
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white/90">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="name"
            stroke="rgba(255,255,255,0.6)"
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="rgba(255,255,255,0.6)"
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="value"
            fill={colors.primary}
            radius={[8, 8, 0, 0]}
            style={{
              filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
            }}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineChart({ data, title, color = 'turquoise' }: ChartProps) {
  const colors = colorPalette[color as keyof typeof colorPalette] || colorPalette.turquoise;
  const chartData = data.map((item) => ({
    name: item.label,
    value: item.value,
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white/90">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsLineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="name"
            stroke="rgba(255,255,255,0.6)"
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.6)"
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors.primary}
            strokeWidth={3}
            dot={{ fill: colors.primary, r: 5 }}
            activeDot={{ r: 7, fill: colors.light }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AreaChartComponent({ data, title, color = 'turquoise' }: ChartProps) {
  const colors = colorPalette[color as keyof typeof colorPalette] || colorPalette.turquoise;
  const chartData = data.map((item) => ({
    name: item.label,
    value: item.value,
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white/90">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.primary} stopOpacity={0.8} />
              <stop offset="95%" stopColor={colors.primary} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="name"
            stroke="rgba(255,255,255,0.6)"
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.6)"
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.primary}
            fill={`url(#gradient-${color})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  title: string;
  centerText?: string;
}

export function DonutChart({ data, title, centerText }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const chartData = data.map((item) => ({
    name: item.label,
    value: item.value,
    fill: item.color.includes('fill-') ? item.color.replace('fill-', '') : item.color,
  }));

  const colorMap: Record<string, string> = {
    'purple-500': '#8b5cf6',
    'turquoise-500': '#06b6d4',
    'blue-500': '#3b82f6',
    'yellow-500': '#eab308',
    'red-500': '#ef4444',
    purple: '#8b5cf6',
    turquoise: '#06b6d4',
    blue: '#3b82f6',
    yellow: '#eab308',
    red: '#ef4444',
    green: '#10b981',
    pink: '#ec4899',
  };

  const COLORS = chartData.map((item) => {
    const colorKey = Object.keys(colorMap).find((key) => item.fill.includes(key));
    return colorKey ? colorMap[colorKey] : '#06b6d4';
  });

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white/90">{title}</h3>
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative">
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {centerText && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{total}</div>
                <div className="text-xs text-white/60">{centerText}</div>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-3 flex-1">
          {chartData.map((item, index) => {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
            return (
              <div key={index} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-sm text-white/80">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/60">{percentage}%</span>
                  <span className="text-sm text-white/90 font-medium">({item.value})</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  color?: string;
  tooltip?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'turquoise',
  tooltip,
}: MetricCardProps) {
  const colorClasses = {
    turquoise: 'from-turquoise-500/20 to-turquoise-600/20 border-turquoise-400/30',
    green: 'from-green-500/20 to-green-600/20 border-green-400/30',
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-400/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-400/30',
    pink: 'from-pink-500/20 to-pink-600/20 border-pink-400/30',
    red: 'from-red-500/20 to-red-600/20 border-red-400/30',
    yellow: 'from-yellow-500/20 to-yellow-600/20 border-yellow-400/30',
  };

  const gradient = colorClasses[color as keyof typeof colorClasses] || colorClasses.turquoise;

  return (
    <div
      className={`bg-gradient-to-br ${gradient} backdrop-blur-sm rounded-lg p-6 border transition-all duration-300 hover:scale-105 hover:shadow-lg relative group`}
      title={tooltip}
    >
      {tooltip && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/90 text-white text-xs rounded px-2 py-1 max-w-xs z-10">
            {tooltip}
          </div>
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-white/70 font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-sm text-white/60 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>
        {icon && <div className="text-white/40">{icon}</div>}
      </div>
    </div>
  );
}
