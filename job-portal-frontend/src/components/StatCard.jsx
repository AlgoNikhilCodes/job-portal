const colorMap = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100',   icon: 'bg-blue-100'   },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-100',  icon: 'bg-green-100'  },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100', icon: 'bg-yellow-100' },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-100',    icon: 'bg-red-100'    },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', icon: 'bg-purple-100' },
  gray:   { bg: 'bg-gray-50',   text: 'text-gray-700',   border: 'border-gray-100',   icon: 'bg-gray-100'   },
};

const StatCard = ({ label, value, icon, color = 'blue', trend }) => {
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`bg-white rounded-xl border ${c.border} p-5 flex items-center gap-4 shadow-sm`}>
      <div className={`w-12 h-12 ${c.icon} rounded-xl flex items-center justify-center text-2xl shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
        <p className={`text-2xl font-bold ${c.text}`}>{value ?? '—'}</p>
        {trend && (
          <p className={`text-xs mt-0.5 font-medium ${trend.direction === 'up' ? 'text-green-600' : 'text-red-500'}`}>
            {trend.direction === 'up' ? '▲' : '▼'} {trend.value}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
