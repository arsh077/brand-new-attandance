
import React from 'react';

interface StatItem {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  color: string;
}

interface DashboardStatsProps {
  stats: StatItem[];
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10 text-${stat.color.split('-')[1]}-600`}>
              {stat.icon}
            </div>
            {stat.subValue && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-50 text-green-600">
                {stat.subValue}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
          <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
