import React, { useState } from 'react';
import './DataChart.css';

// EDITORIAL Chart Palette — DATAVERSE.AI
const CHART_PALETTE = [
  '#171717', // 1. primary data series (high-contrast charcoal/black)
  '#0284C7', // 2. secondary data series (cyan highlight)
  '#0D9488', // 3. positive / tertiary (teal)
  '#D97706', // 4. warning / comparison (amber)
  '#6366F1', // 5. additional category (indigo)
  '#E11D48', // 6. additional category (rose)
];

export const DataChart = ({
  type = 'line',
  data = [],
  title,
  subtitle,
  height = 240,
  accentColor = '#171717',
  secondaryColor = '#0284C7',
  unit = '',
}) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="chart-container glass-panel">
        {(title || subtitle) && (
          <div className="chart-header">
            <div>
              {title && <h4 className="chart-title">{title}</h4>}
              {subtitle && <span className="chart-subtitle">{subtitle}</span>}
            </div>
          </div>
        )}
        <div className="chart-empty" style={{ height: `${height}px` }}>
          <span>No calculated telemetry data available</span>
        </div>
      </div>
    );
  }

  // Handle Donut Chart
  if (type === 'donut') {
    const total = data.reduce((sum, d) => sum + (d.value || 0), 0) || 1;
    let accumulatedAngle = 0;
    const size = 180;
    const center = size / 2;
    const radius = 65;
    const innerRadius = 45;

    const slices = data.map((d, idx) => {
      const sliceAngle = ((d.value || 0) / total) * 360;
      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + sliceAngle;
      accumulatedAngle += sliceAngle;

      // Coordinate helper
      const startRad = ((startAngle - 90) * Math.PI) / 180;
      const endRad = ((endAngle - 90) * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const ix1 = center + innerRadius * Math.cos(startRad);
      const iy1 = center + innerRadius * Math.sin(startRad);
      const ix2 = center + innerRadius * Math.cos(endRad);
      const iy2 = center + innerRadius * Math.sin(endRad);

      const largeArc = sliceAngle > 180 ? 1 : 0;
      const pathData = `M ${ix1} ${iy1} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;

      const color = d.color || CHART_PALETTE[idx % CHART_PALETTE.length];
      return { ...d, pathData, color, pct: Math.round(((d.value || 0) / total) * 100) };
    });

    return (
      <div className="chart-container glass-panel">
        {(title || subtitle) && (
          <div className="chart-header">
            <div>
              {title && <h4 className="chart-title">{title}</h4>}
              {subtitle && <span className="chart-subtitle">{subtitle}</span>}
            </div>
          </div>
        )}

        <div className="donut-wrap">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-svg">
            {slices.map((s, idx) => (
              <path
                key={idx}
                d={s.pathData}
                fill={s.color}
                opacity={hoverIndex === idx ? 1 : 0.85}
                className="donut-slice"
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            ))}
            <text x={center} y={center - 4} textAnchor="middle" fill="#F8FAFC" fontSize="16" fontWeight="700">
              {hoverIndex !== null && slices[hoverIndex] ? `${slices[hoverIndex].pct}%` : total.toLocaleString()}
            </text>
            <text x={center} y={center + 14} textAnchor="middle" fill="#94A3B8" fontSize="10">
              {hoverIndex !== null && slices[hoverIndex] ? slices[hoverIndex].label : 'Total Volume'}
            </text>
          </svg>

          <div className="donut-legend">
            {slices.map((s, idx) => (
              <div 
                key={idx} 
                className={`donut-legend-item ${hoverIndex === idx ? 'legend-item-active' : ''}`}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                <span className="legend-dot" style={{ backgroundColor: s.color }} />
                <span className="donut-legend-label">{s.label}</span>
                <span className="donut-legend-val">{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate scales for Line / Bar
  const maxValue = Math.max(...data.map(d => Math.max(Number(d.value) || 0, Number(d.secondary) || 0)), 10);
  const paddingX = 44;
  const paddingY = 32;
  const width = 640;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Build SVG points for Line/Area
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1 || 1)) * chartWidth;
    const y = height - paddingY - ((Number(d.value) || 0) / maxValue) * chartHeight;
    return { x, y, ...d };
  });

  const secondaryPoints = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1 || 1)) * chartWidth;
    const y = height - paddingY - ((Number(d.secondary) || 0) / maxValue) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const areaD = `${pathD} L ${points[points.length - 1]?.x || 0} ${height - paddingY} L ${points[0]?.x || 0} ${height - paddingY} Z`;
  const gradId = `grad-${accentColor.replace(/[^a-zA-Z0-9]/g, '')}`;

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
                <span>Target / Prior</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="chart-svg-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.28" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines (Subtle #1E293B dividers) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = height - paddingY - ratio * chartHeight;
            const yVal = Math.round(ratio * maxValue);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#1E293B"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="9.5"
                  fontFamily="var(--font-mono)"
                >
                  {yVal >= 1000 ? `${(yVal / 1000).toFixed(1)}k` : yVal}
                </text>
              </g>
            );
          })}

          {type === 'bar' ? (
            // Bar Chart Render
            data.map((d, i) => {
              const barWidth = Math.min(36, Math.max(14, (chartWidth / data.length) * 0.45));
              const x = paddingX + (i / data.length) * chartWidth + (chartWidth / data.length - barWidth) / 2;
              const barH = Math.max(2, ((Number(d.value) || 0) / maxValue) * chartHeight);
              const y = height - paddingY - barH;
              const isHovered = hoverIndex === i;
              const barColor = d.color || CHART_PALETTE[i % CHART_PALETTE.length];

              return (
                <g 
                  key={i} 
                  onMouseEnter={() => setHoverIndex(i)} 
                  onMouseLeave={() => setHoverIndex(null)}
                  className="chart-bar-group"
                >
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    rx="4"
                    fill={barColor}
                    opacity={isHovered ? 1 : 0.85}
                    className="chart-bar"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={height - 12}
                    textAnchor="middle"
                    fill={isHovered ? '#F8FAFC' : '#94A3B8'}
                    fontSize="10"
                    fontFamily="var(--font-sans)"
                  >
                    {d.label?.length > 9 ? d.label.slice(0, 8) + '…' : d.label}
                  </text>
                </g>
              );
            })
          ) : (
            // Line / Area Chart Render
            <>
              <path d={areaD} fill={`url(#${gradId})`} />

              {data[0]?.secondary !== undefined && (
                <path
                  d={secondaryPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '')}
                  fill="none"
                  stroke={secondaryColor}
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.8"
                />
              )}

              <path d={pathD} fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {points.map((p, i) => {
                const isHovered = hoverIndex === i;
                return (
                  <g 
                    key={i} 
                    onMouseEnter={() => setHoverIndex(i)} 
                    onMouseLeave={() => setHoverIndex(null)}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 5.5 : 3.5}
                      fill={accentColor}
                      stroke="#0B1020"
                      strokeWidth="2"
                      className="chart-point"
                    />
                    <text
                      x={p.x}
                      y={height - 12}
                      textAnchor="middle"
                      fill={isHovered ? '#F8FAFC' : '#94A3B8'}
                      fontSize="10"
                      fontFamily="var(--font-sans)"
                    >
                      {p.label?.length > 10 ? p.label.slice(0, 8) + '…' : p.label}
                    </text>
                  </g>
                );
              })}
            </>
          )}
        </svg>

        {/* Dynamic Tooltip */}
        {hoverIndex !== null && data[hoverIndex] && (
          <div
            className="chart-tooltip elevated-panel"
            style={{
              left: `${Math.min(88, Math.max(12, (hoverIndex / (data.length - 1 || 1)) * 80 + 10))}%`,
            }}
          >
            <div className="tooltip-title">{data[hoverIndex].label}</div>
            <div className="tooltip-val" style={{ color: accentColor }}>
              Current: <strong>{Number(data[hoverIndex].value || 0).toLocaleString()} {unit}</strong>
            </div>
            {data[hoverIndex].secondary !== undefined && (
              <div className="tooltip-val" style={{ color: secondaryColor }}>
                Target: {Number(data[hoverIndex].secondary || 0).toLocaleString()} {unit}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
