import React, { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '../utils/formatters';

const PLATFORM_COLORS = {
  'Shopee': '#FF5722',
  'Amazon Flex': '#FF9900',
  'Mercado Livre': '#3B82F6',
  'Lalamove': '#FF8200',
  'Loggi': '#00AEEF',
  'Uber Flash': '#10B981',
  'Uber': '#8B5CF6',
  '99': '#FBBF24',
  'InDrive': '#10B981',
  'Outra': '#64748B'
};

export const SVGChart = ({ type = 'earnings', data = [] }) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 320, height: 160 });

  // Escuta resize do container para manter o SVG responsivo de verdade
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: width || 320,
          height: type === 'donut' ? 180 : 160
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [type]);

  // 1. RENDERIZADOR: GRÁFICO DE GANHOS E CUSTOS (BAR CHART)
  const renderBarChart = () => {
    const { width, height } = dimensions;
    const padding = { top: 20, right: 15, bottom: 25, left: 45 };

    // Filtra as últimas 7 saídas (em ordem cronológica)
    const recentData = [...data].slice(0, 7).reverse();

    if (recentData.length === 0) {
      return (
        <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: 'var(--text-muted)' }}>
          <i className="bx bx-bar-chart-alt-2" style={{ fontSize: '2rem' }}></i>
          <p style={{ fontSize: '0.85rem' }}>Sem dados suficientes para gerar o gráfico.</p>
        </div>
      );
    }

    // Calcula valor máximo da escala
    let maxVal = 100;
    recentData.forEach(run => {
      const val = Math.max(parseFloat(run.grossEarning || 0), parseFloat(run.totalExpense || 0));
      if (val > maxVal) maxVal = val;
    });
    // Arredonda para múltiplo de 50
    maxVal = Math.ceil(maxVal / 50) * 50;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const groupGap = chartWidth / recentData.length;
    const barWidth = Math.max(8, groupGap * 0.3);

    // Linhas de grade e escalas do eixo Y
    const gridLines = [];
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const val = (maxVal / gridCount) * i;
      const y = padding.top + chartHeight - (val / maxVal) * chartHeight;
      gridLines.push({ y, val });
    }

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {/* Linhas de Grade e Eixo Y */}
        {gridLines.map((line, idx) => (
          <g key={`grid-${idx}`}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={width - padding.right}
              y2={line.y}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="3,3"
            />
            <text
              x={padding.left - 10}
              y={line.y + 4}
              fill="#64748B"
              fontSize="9"
              fontFamily="Inter"
              textAnchor="end"
            >
              R$ {Math.round(line.val)}
            </text>
          </g>
        ))}

        {/* Barras e Eixo X */}
        {recentData.map((run, index) => {
          const groupX = padding.left + (index * groupGap) + (groupGap * 0.1);
          
          const grossVal = parseFloat(run.grossEarning) || 0;
          const expVal = parseFloat(run.totalExpense) || 0;

          const grossH = (grossVal / maxVal) * chartHeight;
          const grossY = padding.top + chartHeight - grossH;
          const grossX = groupX;

          const expH = (expVal / maxVal) * chartHeight;
          const expY = padding.top + chartHeight - expH;
          const expX = groupX + barWidth + 3;

          // Data formatada para X
          let dateStr = '';
          try {
            const dateObj = new Date(run.date + 'T00:00:00');
            dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
          } catch {
            dateStr = run.date;
          }

          return (
            <g key={`bar-group-${index}`} className="chart-bar-group">
              {/* Coluna Ganhos (Verde) */}
              <rect
                x={grossX}
                y={grossY}
                width={barWidth}
                height={Math.max(2, grossH)}
                className="chart-svg-bar-earning"
                rx="2"
              >
                <animate attributeName="height" from="0" to={Math.max(2, grossH)} dur="0.6s" fill="freeze" />
                <animate attributeName="y" from={padding.top + chartHeight} to={grossY} dur="0.6s" fill="freeze" />
              </rect>

              {/* Coluna Gastos (Vermelho) */}
              <rect
                x={expX}
                y={expY}
                width={barWidth}
                height={Math.max(2, expH)}
                className="chart-svg-bar-expense"
                rx="2"
              >
                <animate attributeName="height" from="0" to={Math.max(2, expH)} dur="0.6s" fill="freeze" />
                <animate attributeName="y" from={padding.top + chartHeight} to={expY} dur="0.6s" fill="freeze" />
              </rect>

              {/* Data Rótulo */}
              <text
                x={groupX + barWidth + 1}
                y={height - 6}
                fill="#94A3B8"
                fontSize="9"
                fontFamily="Inter"
                textAnchor="middle"
              >
                {dateStr}
              </text>
            </g>
          );
        })}

        {/* Linha Base */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={width - padding.right}
          y2={padding.top + chartHeight}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
        />
      </svg>
    );
  };

  // 2. RENDERIZADOR: GRÁFICO DE DONUT DE DISTRIBUIÇÃO POR PLATAFORMA
  const renderDonutChart = () => {
    const { width, height } = dimensions;
    const cx = 90;
    const cy = 90;
    const r = 50;
    const circ = 2 * Math.PI * r;

    // Agrupa dados por plataforma
    const totals = {};
    let grandTotal = 0;

    data.forEach(item => {
      const plat = item.platform || 'Outra';
      const amt = parseFloat(item.grossEarning) || 0;
      totals[plat] = (totals[plat] || 0) + amt;
      grandTotal += amt;
    });

    if (grandTotal === 0) {
      return (
        <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: 'var(--text-muted)' }}>
          <i className="bx bx-calendar-x" style={{ fontSize: '2rem' }}></i>
          <p style={{ fontSize: '0.85rem' }}>Sem dados de plataformas.</p>
        </div>
      );
    }

    const segments = Object.entries(totals)
      .map(([label, val]) => {
        const pct = (val / grandTotal) * 100;
        return {
          label,
          value: val,
          percentage: pct,
          color: PLATFORM_COLORS[label] || PLATFORM_COLORS['Outra']
        };
      })
      .sort((a, b) => b.value - a.value);

    let accumulatedPercent = 0;

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'flex' }}>
        {/* Arcos do Donut */}
        {segments.map((seg, idx) => {
          const strokeLength = (seg.percentage / 100) * circ;
          const strokeOffset = circ - strokeLength;
          const angleRotation = (accumulatedPercent / 100) * 360 - 90;
          accumulatedPercent += seg.percentage;

          return (
            <circle
              key={`segment-${idx}`}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeDasharray={circ}
              strokeDashoffset={circ}
              transform={`rotate(${angleRotation} ${cx} ${cy})`}
              className="chart-donut-segment"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            >
              <animate attributeName="stroke-dashoffset" from={circ} to={strokeOffset} dur="0.6s" fill="freeze" />
            </circle>
          );
        })}

        {/* Furo central do donut */}
        <circle cx={cx} cy={cy} r="38" fill="#161C2C" />
        <text x={cx} y={cy - 4} fill="#64748B" fontSize="8" fontFamily="Inter" textAnchor="middle" fontWeight="600" letterSpacing="0.5">
          GANHOS
        </text>
        <text x={cx} y={cy + 9} fill="#FFFFFF" fontSize="11" fontFamily="Outfit" textAnchor="middle" fontWeight="700">
          R$ {Math.round(grandTotal)}
        </text>

        {/* Legendas Laterais */}
        {segments.slice(0, 4).map((seg, idx) => {
          const y = 25 + idx * 34;
          return (
            <g key={`legend-${idx}`} transform={`translate(160, ${y})`}>
              <circle cx="0" cy="-4" r="5" fill={seg.color} />
              <text x="12" y="0" fill="#F8FAFC" fontSize="9" fontFamily="Outfit" fontWeight="600">
                {seg.label}
              </text>
              <text x="12" y="10" fill="#94A3B8" fontSize="8" fontFamily="Inter">
                {seg.percentage.toFixed(1)}% ({formatCurrency(seg.value)})
              </text>
            </g>
          );
        })}

        {segments.length > 4 && (
          <text x="172" y="156" fill="#64748B" fontSize="8" fontFamily="Inter" fontStyle="italic">
            + {segments.length - 4} plataformas
          </text>
        )}
      </svg>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        minHeight: type === 'donut' ? '180px' : '160px'
      }}
    >
      {type === 'donut' ? renderDonutChart() : renderBarChart()}
    </div>
  );
};
export default SVGChart;
