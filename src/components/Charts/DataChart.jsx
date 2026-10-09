import React, { useState } from 'react';
import './DataChart.css';

export const DataChart = ({
  type = 'line',
  data = [],
  title,
  subtitle,
  height = 240,
  accentColor = '#6366f1',
  secondaryColor = '#06b6d4',
}) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="chart-container glass-panel">
        <div className="chart-empty">No telemetry data available</div>
      </div>
    );
  }

  // Calculate scales
  const maxValue = Math.max(...data.map(d => Math.max(d.value || 0, d.secondary || 0)), 10);
  const paddingX = 40;
  const paddingY = 30;
  const width = 600;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Build SVG points for Line/Area
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1 || 1)) * chartWidth;
    const y = height - paddingY - ((d.value || 0) / maxValue) * chartHeight;
    return { x, y, ...d };
  });

  const secondaryPoints = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1 || 1)) * chartWidth;
    const y = height - paddingY - ((d.secondary || 0) / maxValue) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const areaD = `${pathD} L ${points[points.length - 1]?.x || 0} ${height - paddingY} L ${points[0]?.x || 0} ${height - paddingY} Z`;

  return (
    <div className="chart-container glass-panel">
      {(title || subtitle) && (
        <div className="chart-header">
          <div>
            {title && <h4 className="chart-title">{title}</h4>}
            {subtitle && <span className="chart-subtitle">{subtitle}</span>}
          </div>
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: accentColor }} />
              <span>Current</span>
            </div>
            {data[0]?.secondary !== undefined && (
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: secondaryColor }} />
                <span>Target</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="chart-svg-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`grad-${accentColor.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = height - paddingY - ratio * chartHeight;
            return (
              <line
                key={idx}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeDasharray="4 4"
              />
            );
          })}

          {type === 'bar' ? (
            // Bar Chart Render
            data.map((d, i) => {
              const barWidth = Math.max(12, (chartWidth / data.length) * 0.5);
              const x = paddingX + (i / data.length) * chartWidth + (chartWidth / data.length - barWidth) / 2;
              const barH = ((d.value || 0) / maxValue) * chartHeight;
              const y = height - paddingY - barH;
              const isHovered = hoverIndex === i;

              return (
                <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    rx="4"
                    fill={d.color || accentColor}
                    opacity={isHovered ? 1 : 0.85}
                    className="chart-bar"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={height - 10}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="11"
                    fontFamily="var(--font-sans)"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })
          ) : (
            // Line / Area Chart Render
            <>
              <path d={areaD} fill={`url(#grad-${accentColor.replace('#', '')})`} />
              
              {data[0]?.secondary !== undefined && (
                <path
                  d={secondaryPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '')}
                  fill="none"
                  stroke={secondaryColor}
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              )}

              <path d={pathD} fill="none" stroke={accentColor} strokeWidth="3" strokeLinecap="round" />

              {points.map((p, i) => (
                <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoverIndex === i ? 6 : 4}
                    fill={accentColor}
                    stroke="#0f172a"
                    strokeWidth="2"
                    className="chart-point"
                  />
                  <text
                    x={p.x}
                    y={height - 10}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="11"
                    fontFamily="var(--font-sans)"
                  >
                    {p.label}
                  </text>
                </g>
              ))}
            </>
          )}
        </svg>

        {/* Dynamic Tooltip */}
        {hoverIndex !== null && data[hoverIndex] && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(hoverIndex / (data.length - 1 || 1)) * 80 + 10}%`,
            }}
          >
            <div className="tooltip-title">{data[hoverIndex].label}</div>
            <div className="tooltip-val" style={{ color: accentColor }}>
              Value: <strong>{data[hoverIndex].value?.toLocaleString()}</strong>
            </div>
            {data[hoverIndex].secondary !== undefined && (
              <div className="tooltip-val" style={{ color: secondaryColor }}>
                Target: {data[hoverIndex].secondary?.toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
