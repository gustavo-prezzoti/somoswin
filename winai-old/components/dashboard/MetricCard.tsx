

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '../ui/Card';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactElement;
  color: 'emerald' | 'red' | 'amber';
  period?: string;
}

const colorClasses = {
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: 'text-emerald-500',
    trend: 'text-emerald-600',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: 'text-red-500',
    trend: 'text-red-600',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    icon: 'text-amber-500',
    trend: 'text-amber-600',
  },
};

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, trend, icon, color, period = 'ao período anterior' }) => {
  const classes = colorClasses[color];

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-emerald-900">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${classes.bg} ${classes.icon}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-1 text-sm mt-2">
        {trend === 'up' ? (
          <TrendingUp className={`w-4 h-4 ${classes.trend}`} />
        ) : (
          <TrendingDown className={`w-4 h-4 ${classes.trend}`} />
        )}
        <span className={`${classes.trend} font-medium`}>{change}</span>
        <span className="text-gray-500">em relação {period}</span>
      </div>
    </Card>
  );
};

export default MetricCard;