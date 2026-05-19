import React from 'react';

export const ProgressBar = ({
  value, // valor atual
  max, // valor máximo
  colorClass = '', // classe de cor customizada
  showLabel = true,
  labelFormat = 'fraction', // 'fraction' (8.800 / 10.000) ou 'percentage' (88%)
  labelPrefix = '',
  labelSuffix = ''
}) => {
  const percentage = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  
  // Cor adaptativa padrão se nenhuma classe de cor for passada
  const getAutoColorClass = () => {
    if (colorClass) return colorClass;
    if (percentage >= 90) return 'bg-red'; // Alerta crítico (e.g. manutenção)
    if (percentage >= 75) return 'bg-yellow'; // Próximo de vencer
    return 'bg-emerald'; // Sob controle
  };

  const getLabel = () => {
    if (labelFormat === 'percentage') {
      return `${Math.round(percentage)}%`;
    }
    // formatador do tipo fração
    return `${value.toLocaleString('pt-BR')} / ${max.toLocaleString('pt-BR')}`;
  };

  return (
    <div className="maint-progress-wrapper" style={{ width: '100%' }}>
      <div className="maint-bar" style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
        <div
          className={`maint-fill ${getAutoColorClass()}`}
          style={{
            width: `${percentage}%`,
            height: '100%',
            borderRadius: '10px',
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        ></div>
      </div>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>{labelPrefix}</span>
          <span>{getLabel()}{labelSuffix}</span>
        </div>
      )}
    </div>
  );
};
export default ProgressBar;
