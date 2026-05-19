/**
 * RotaLucro - Engine de Gráficos SVG Dinâmicos
 * Gera gráficos profissionais, animados e responsivos em SVG puro, sem dependências.
 */

export const Charts = {
    // Cores das plataformas
    PLATFORM_COLORS: {
        'Shopee': '#FF5722',
        'Amazon Flex': '#FF9900',
        'Mercado Livre': '#3B82F6',
        'Lalamove': '#FF8200',
        'Loggi': '#00AEEF',
        'Uber Flash': '#10B981',
        'Outra': '#64748B'
    },

    // 1. DESENHA GRÁFICO DE FATURAMENTO X GASTOS (ÚLTIMOS 7 DIAS)
    drawEarningsChart(containerId, runs) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Limpa container
        container.innerHTML = '';

        // Pega as últimas 7 saídas (em ordem cronológica)
        const recentRuns = [...runs].slice(0, 7).reverse();

        if (recentRuns.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bx bx-bar-chart-alt-2"></i>
                    <p>Sem dados suficientes para gerar o gráfico.</p>
                </div>`;
            return;
        }

        const width = container.clientWidth || 350;
        const height = 160;
        const padding = { top: 20, right: 15, bottom: 25, left: 45 };

        // Encontra valor máximo para escala
        let maxVal = 100;
        recentRuns.forEach(run => {
            const val = Math.max(parseFloat(run.grossEarning), parseFloat(run.totalExpense));
            if (val > maxVal) maxVal = val;
        });
        // Arredonda para cima para uma escala bonita (ex: múltiplos de 50 ou 100)
        maxVal = Math.ceil(maxVal / 50) * 50;

        // Escalas de renderização
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        const barWidth = Math.max(10, (chartWidth / recentRuns.length) * 0.35);
        const groupGap = (chartWidth / recentRuns.length);

        // Cria SVG
        let svg = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">`;

        // 1. Linhas de Grade Horizontais
        const gridLines = 4;
        for (let i = 0; i <= gridLines; i++) {
            const val = (maxVal / gridLines) * i;
            const y = padding.top + chartHeight - (val / maxVal) * chartHeight;
            
            // Linha pontilhada
            svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3" />`;
            // Texto do eixo Y
            svg += `<text x="${padding.left - 10}" y="${y + 4}" fill="#64748B" font-size="9" font-family="Inter" text-anchor="end">R$ ${Math.round(val)}</text>`;
        }

        // 2. Renderização das Colunas
        recentRuns.forEach((run, index) => {
            const groupX = padding.left + (index * groupGap) + (groupGap * 0.1);
            
            // Altura do faturamento bruto (Verde)
            const grossH = (parseFloat(run.grossEarning) / maxVal) * chartHeight;
            const grossY = padding.top + chartHeight - grossH;
            const grossX = groupX;

            // Altura da despesa total (Vermelho)
            const expH = (parseFloat(run.totalExpense) / maxVal) * chartHeight;
            const expY = padding.top + chartHeight - expH;
            const expX = groupX + barWidth + 3; // Lado a lado

            // Formatação de data
            const dateObj = new Date(run.date + 'T00:00:00');
            const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');

            // Coluna Ganhos (Verde)
            svg += `
                <g class="chart-bar-group">
                    <rect x="${grossX}" y="${grossY}" width="${barWidth}" height="${grossH}" class="chart-svg-bar-earning">
                        <animate attributeName="height" from="0" to="${grossH}" dur="0.8s" fill="freeze" />
                        <animate attributeName="y" from="${padding.top + chartHeight}" to="${grossY}" dur="0.8s" fill="freeze" />
                    </rect>
                    
                    <!-- Coluna Despesas (Vermelho) -->
                    <rect x="${expX}" y="${expY}" width="${barWidth}" height="${expH}" class="chart-svg-bar-expense">
                        <animate attributeName="height" from="0" to="${expH}" dur="0.8s" fill="freeze" />
                        <animate attributeName="y" from="${padding.top + chartHeight}" to="${expY}" dur="0.8s" fill="freeze" />
                    </rect>
                    
                    <!-- Rótulo Data X -->
                    <text x="${groupX + barWidth + 1}" y="${height - 6}" fill="#94A3B8" font-size="9" font-family="Inter" text-anchor="middle">
                        ${dateStr}
                    </text>
                </g>
            `;
        });

        // Linha do eixo X
        svg += `<line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="rgba(255,255,255,0.12)" stroke-width="1" />`;

        svg += `</svg>`;
        container.innerHTML = svg;
    },

    // 2. DESENHA GRÁFICO DE PIZZA/DONUT DE GANHOS POR PLATAFORMA
    drawPlatformDonut(containerId, runs) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        if (runs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bx bx-calendar-x"></i>
                    <p>Sem dados de plataformas.</p>
                </div>`;
            return;
        }

        // Agrupa faturamento bruto por plataforma
        const platformTotals = {};
        let grandTotal = 0;

        runs.forEach(run => {
            const plat = run.platform || 'Outra';
            const amt = parseFloat(run.grossEarning);
            platformTotals[plat] = (platformTotals[plat] || 0) + amt;
            grandTotal += amt;
        });

        // Converte em array ordenado por valor
        const chartData = Object.keys(platformTotals).map(plat => {
            const amt = platformTotals[plat];
            const pct = grandTotal > 0 ? (amt / grandTotal) * 100 : 0;
            return {
                label: plat,
                value: amt,
                percentage: pct,
                color: this.PLATFORM_COLORS[plat] || this.PLATFORM_COLORS['Outra']
            };
        }).sort((a, b) => b.value - a.value);

        const width = container.clientWidth || 320;
        const height = 180;
        const cx = 90;
        const cy = 90;
        const r = 50;
        const circ = 2 * Math.PI * r; // 314.16

        let svg = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="display: flex;">`;
        
        let accumulatedPercent = 0;

        // Renderiza cada arco da rosquinha
        chartData.forEach(segment => {
            const strokeLength = (segment.percentage / 100) * circ;
            const strokeOffset = circ - strokeLength;
            // Rotação acumulada para iniciar de onde o anterior parou
            const angleRotation = (accumulatedPercent / 100) * 360 - 90;

            svg += `
                <circle cx="${cx}" cy="${cy}" r="${r}" 
                        fill="none" 
                        stroke="${segment.color}" 
                        stroke-width="12" 
                        stroke-dasharray="${circ}" 
                        stroke-dashoffset="${circ}"
                        transform="rotate(${angleRotation} ${cx} ${cy})"
                        style="transition: stroke-dashoffset 0.8s ease;"
                        class="chart-donut-segment">
                    <animate attributeName="stroke-dashoffset" from="${circ}" to="${strokeOffset}" dur="0.8s" fill="freeze" />
                </circle>
            `;
            accumulatedPercent += segment.percentage;
        });

        // Círculo central (Cria o efeito rosquinha do Nubank)
        svg += `
            <circle cx="${cx}" cy="${cy}" r="38" fill="#161C2C" />
            <text x="${cx}" y="${cy - 3}" fill="#64748B" font-size="8" font-family="Inter" text-anchor="middle" font-weight="600" letter-spacing="0.5">GANHOS</text>
            <text x="${cx}" y="${cy + 10}" fill="#FFFFFF" font-size="11" font-family="Outfit" text-anchor="middle" font-weight="700">R$ ${Math.round(grandTotal)}</text>
        `;

        // Renderiza as legendas no lado direito (x: 160)
        let legendY = 25;
        const maxLegendItems = 4;
        
        chartData.slice(0, maxLegendItems).forEach(segment => {
            svg += `
                <g transform="translate(160, ${legendY})">
                    <circle cx="0" cy="-4" r="5" fill="${segment.color}" />
                    <text x="12" y="0" fill="#F8FAFC" font-size="9" font-family="Outfit" font-weight="600">${segment.label}</text>
                    <text x="12" y="10" fill="#94A3B8" font-size="8" font-family="Inter">${segment.percentage.toFixed(1)}% (R$ ${segment.value.toFixed(0)})</text>
                </g>
            `;
            legendY += 34;
        });

        if (chartData.length > maxLegendItems) {
            svg += `
                <text x="172" y="${legendY + 4}" fill="#64748B" font-size="8" font-family="Inter" font-style="italic">
                    + ${chartData.length - maxLegendItems} plataformas
                </text>
            `;
        }

        svg += `</svg>`;
        container.innerHTML = svg;
    }
};
window.Charts = Charts;
