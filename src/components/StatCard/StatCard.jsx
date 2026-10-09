import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import './StatCard.css';

export const StatCard = ({ title, value, change, trend, subtitle, color = 'primary' }) => {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';

  return (
    <div className={`stat-card glass-panel stat-card-${color}`}>
      <div className="stat-card-glow" />
      <div className="stat-card-header">
        <span className="stat-title">{title}</span>
        {change && (
          <div className={`stat-trend ${isPositive ? 'trend-up' : isNegative ? 'trend-down' : 'trend-neutral'}`}>
            {isPositive && <TrendingUp size={14} />}
            {isNegative && <TrendingDown size={14} />}
            {!isPositive && !isNegative && <Minus size={14} />}
            <span>{change}</span>
          </div>
        )}
      </div>

      <div className="stat-body">
        <h3 className="stat-value">{value}</h3>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
};
