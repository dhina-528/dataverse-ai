import React from 'react';
import { TrendingUp, TrendingDown, Minus, Info, HelpCircle } from 'lucide-react';
import './StatCard.css';

export const StatCard = ({ 
  title, 
  value, 
  change, 
  trend, 
  subtitle, 
  color = 'primary',
  available = true,
  calculationTooltip,
  sparklineData = null
}) => {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';

  // SVG Sparkline calculation
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const minVal = Math.min(...sparklineData);
    const maxVal = Math.max(...sparklineData);
    const range = maxVal - minVal || 1;
    const width = 80;
    const height = 24;

    const points = sparklineData.map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * width;
      const y = height - ((val - minVal) / range) * (height - 4) - 2;
      return `${x},${y}`;
    }).join(' ');

    const strokeColor = isPositive ? 'var(--teal)' : isNegative ? 'var(--rose)' : 'var(--chart-1)';

    return (
      <svg className="stat-sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div className={`stat-card glass-panel stat-card-${color} ${!available ? 'stat-card-unavailable' : ''}`}>
      <div className="stat-card-header">
        <div className="stat-title-group">
          <span className="stat-title">{title}</span>
          {calculationTooltip && (
            <span className="stat-tooltip-trigger" title={calculationTooltip}>
              <HelpCircle size={12} className="text-muted" />
            </span>
          )}
        </div>

        <div className="stat-header-right">
          {change && change !== 'N/A' && (
            <div className={`stat-trend ${isPositive ? 'trend-up' : isNegative ? 'trend-down' : 'trend-neutral'}`}>
              {isPositive && <TrendingUp size={12} />}
              {isNegative && <TrendingDown size={12} />}
              {!isPositive && !isNegative && <Minus size={12} />}
              <span>{change}</span>
            </div>
          )}
          {!available && (
            <span className="badge badge-subtle stat-status-badge">Unavailable</span>
          )}
        </div>
      </div>

      <div className="stat-body">
        <div className="stat-main-row">
          <h3 className={`stat-value ${!available ? 'stat-value-muted' : ''}`}>{value}</h3>
          {available && renderSparkline()}
        </div>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
};
