# Guia de Arquitetura Técnica - RotaLucro (Driver Finance Pro)

Este guia serve como a documentação definitiva da arquitetura mobile para o **RotaLucro**, detalhando a transição do mock local (PWA) para uma aplicação de produção nativa escalável utilizando **React Native + Expo** no frontend, **Supabase** no backend/banco de dados, e **Google Sign-In** para autenticação.

---

## 1. Visão Geral da Arquitetura

O RotaLucro foi desenhado utilizando o padrão **Offline-First**. O motorista está constantemente em trânsito e pode perder a conexão celular. Toda e qualquer ação de cadastro ou visualização de dados deve ocorrer localmente primeiro e sincronizar assincronamente com o Supabase quando a conexão for reestabelecida.

```
┌─────────────────────────────────────────────────────────────┐
│                   REACT NATIVE MOBILE APP                   │
│                                                             │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │   Zustand State Store   │   │  WatermelonDB / Cache   │  │
│  └────────────┬────────────┘   └────────────▲────────────┘  │
│               │                             │               │
│               ▼                             │               │
│  ┌──────────────────────────────────────────┴────────────┐  │
│  │                   Sync Orchestrator                   │  │
│  └────────────────────────────┬──────────────────────────┘  │
└───────────────────────────────┼─────────────────────────────┘
                                │ Sync Engine (HTTPS/Websockets)
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE CLOUD BACKEND                   │
│                                                             │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │   PostgreSQL Database   │   │     GoAuth Service      │  │
│  └─────────────────────────┘   └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Estrutura do Projeto Mobile (React Native + Expo)

Esta é a estrutura padrão recomendada para desenvolvimento do aplicativo utilizando **Expo Router** (roteamento baseado em arquivos):

```
rotalucro-app/
├── app/                         # Páginas e Navegação (Expo Router v3)
│   ├── (auth)/                  # Fluxo de Autenticação
│   │   ├── login.tsx            # Tela de Login (E-mail e Google)
│   │   └── onboarding.tsx       # Onboarding inicial
│   ├── (tabs)/                  # Abas principais pós-login
│   │   ├── _layout.tsx          # Layout da barra de navegação inferior
│   │   ├── index.tsx            # Dashboard / Home
│   │   ├── rotas.tsx            # Cadastro de nova rota
│   │   ├── carro.tsx            # Controle do veículo e custos fixos
│   │   ├── analise.tsx          # Estatísticas e Simuladores
│   │   └── relatorios.tsx       # Filtros e exportações
│   ├── modal-odometro.tsx       # Modal de Atualização de KM
│   ├── modal-meta.tsx           # Modal de nova meta
│   └── _layout.tsx              # Root Layout (Configurações globais e providers)
├── components/                  # Componentes reutilizáveis
│   ├── Card.tsx                 # Card Glassmorphic
│   ├── ProgressBar.tsx          # Barra de progresso customizada
│   ├── SVGChart.tsx             # Gráficos SVG nativos interativos
│   └── CustomButton.tsx         # Botões customizados
├── hooks/                       # Custom React Hooks
│   ├── useAuth.ts               # Hooks de Autenticação Supabase
│   ├── useOfflineSync.ts        # Fila de sincronização local-nuvem
│   └── useRouteCalculator.ts    # Lógica de cálculo de rota em tempo real
├── services/                    # Integração com APIs externas
│   ├── supabase.ts              # Cliente de conexão Supabase
│   └── excelExporter.ts         # Exportador nativo de CSV/XLSX
├── store/                       # Gerenciamento de Estado Global (Zustand)
│   └── useFinanceStore.ts       # Estado financeiro do motorista
└── constants/                   # Paleta de cores, tamanhos e chaves
    └── Colors.ts                # Cores Nubank/Uber Premium
```

---

## 3. Modelo de Banco de Dados Relacional (Supabase/PostgreSQL)

Execute o script SQL abaixo no editor de queries do seu painel do Supabase para criar a estrutura completa do banco de dados relacional com integridade referencial, índices para consultas rápidas e Row-Level Security (RLS) ativo para garantir a privacidade de cada entregador.

```sql
-- Habilita extensão de criptografia UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE USUÁRIOS (Sincronizada com o Auth do Supabase)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilita RLS nos Perfis
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Entregadores podem ver o próprio perfil" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- 2. TABELA DE VEÍCULOS
CREATE TABLE public.vehicles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    model TEXT NOT NULL,
    plate TEXT NOT NULL,
    year INTEGER NOT NULL,
    current_km INTEGER DEFAULT 0 NOT NULL,
    loan_cost DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    insurance_cost DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    ipva_cost DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilita RLS nos Veículos
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Entregadores controlam seus veículos" ON public.vehicles
    FOR ALL USING (auth.uid() = user_id);

-- 3. TABELA DE ROTAS (SAÍDAS)
CREATE TABLE public.runs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    platform TEXT NOT NULL,
    gross_earning DECIMAL(10,2) NOT NULL,
    packages INTEGER NOT NULL DEFAULT 0,
    km_rodados DECIMAL(8,1) NOT NULL,
    fuel_type TEXT NOT NULL,
    fuel_price DECIMAL(6,3) NOT NULL,
    efficiency DECIMAL(4,1) NOT NULL,
    tolls_cost DECIMAL(8,2) DEFAULT 0.00 NOT NULL,
    food_cost DECIMAL(8,2) DEFAULT 0.00 NOT NULL,
    parking_cost DECIMAL(8,2) DEFAULT 0.00 NOT NULL,
    fuel_cost DECIMAL(10,2) GENERATED ALWAYS AS ((km_rodados / efficiency) * fuel_price) STORED,
    total_expense DECIMAL(10,2) GENERATED ALWAYS AS (((km_rodados / efficiency) * fuel_price) + tolls_cost + food_cost + parking_cost) STORED,
    net_profit DECIMAL(10,2) GENERATED ALWAYS AS (gross_earning - (((km_rodados / efficiency) * fuel_price) + tolls_cost + food_cost + parking_cost)) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para velocidade na busca histórica
CREATE INDEX idx_runs_user_date ON public.runs(user_id, date DESC);
CREATE INDEX idx_runs_platform ON public.runs(platform);

-- Habilita RLS nas Rotas
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Entregadores gerenciam suas rotas" ON public.runs
    FOR ALL USING (auth.uid() = user_id);

-- 4. TABELA DE MANUTENÇÃO DO VEÍCULO
CREATE TABLE public.maintenance_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- 'oil', 'tires', 'brakes'
    last_changed_km INTEGER NOT NULL,
    interval_km INTEGER NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. TABELA DE METAS FINANCEIRAS
CREATE TABLE public.goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    target_amount DECIMAL(10,2) NOT NULL,
    current_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    deadline DATE NOT NULL,
    category TEXT DEFAULT 'geral' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilita RLS nas Metas
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Entregadores gerenciam suas metas" ON public.goals
    FOR ALL USING (auth.uid() = user_id);
```

---

## 4. Componente React Native de Produção (Exemplo Prático)

Este é um exemplo de como implementar a tela de cadastro de rotas utilizando **React Native + TypeScript + StyleSheet**, demonstrando como os cálculos de combustível e margem de lucro são calculados e exibidos em tempo real no app nativo:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../services/supabase';

export default function NovaRotaScreen() {
  const [platform, setPlatform] = useState('Shopee');
  const [earning, setEarning] = useState('');
  const [packages, setPackages] = useState('');
  const [km, setKm] = useState('');
  const [fuelPrice, setFuelPrice] = useState('3.79');
  const [efficiency, setEfficiency] = useState('9.5');
  
  // States de cálculo em tempo real
  const [fuelCost, setFuelCost] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [margin, setMargin] = useState(0);

  // Efeito de computação automática em tempo real
  useEffect(() => {
    const valEarning = parseFloat(earning) || 0;
    const valKm = parseFloat(km) || 0;
    const valFuelPrice = parseFloat(fuelPrice) || 0;
    const valEfficiency = parseFloat(efficiency) || 1;

    const calculatedFuel = (valKm / valEfficiency) * valFuelPrice;
    const calculatedExpense = calculatedFuel; // adicione pedágios aqui futuramente
    const calculatedProfit = valEarning - calculatedExpense;
    const calculatedMargin = valEarning > 0 ? (calculatedProfit / valEarning) * 100 : 0;

    setFuelCost(calculatedFuel);
    setTotalExpense(calculatedExpense);
    setNetProfit(calculatedProfit);
    setMargin(calculatedMargin);
  }, [earning, km, fuelPrice, efficiency]);

  const handleSave = async () => {
    if (!earning || !km || !packages) {
      Alert.alert('Erro', 'Por favor, preencha os dados obrigatórios.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { error } = await supabase.from('runs').insert({
        user_id: user.id,
        platform,
        gross_earning: parseFloat(earning),
        packages: parseInt(packages),
        km_rodados: parseFloat(km),
        fuel_type: 'Etanol',
        fuel_price: parseFloat(fuelPrice),
        efficiency: parseFloat(efficiency),
      });

      if (error) throw error;

      Alert.alert('Sucesso', 'Rota de entrega salva!');
      setEarning('');
      setKm('');
      setPackages('');
    } catch (err: any) {
      Alert.alert('Erro de Sincronização', err.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Nova Rota de Entrega</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Valor Recebido (Bruto)</Text>
        <TextInput 
          style={styles.input} 
          keyboardType="numeric" 
          placeholder="R$ 0,00"
          placeholderTextColor="#64748B"
          value={earning}
          onChangeText={setEarning}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Pacotes Entregues</Text>
        <TextInput 
          style={styles.input} 
          keyboardType="numeric" 
          placeholder="Ex: 40"
          placeholderTextColor="#64748B"
          value={packages}
          onChangeText={setPackages}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Quilômetros Rodados</Text>
        <TextInput 
          style={styles.input} 
          keyboardType="numeric" 
          placeholder="Ex: 75 km"
          placeholderTextColor="#64748B"
          value={km}
          onChangeText={setKm}
        />
      </View>

      {/* Card de Cálculo em Tempo Real */}
      <View style={styles.calcCard}>
        <Text style={styles.calcTitle}>Estimativa da Rota (Tempo Real)</Text>
        <View style={styles.row}>
          <Text style={styles.calcLabel}>Gasto Combustível:</Text>
          <Text style={styles.calcValRed}>R$ {fuelCost.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.calcLabel}>Lucro Líquido Real:</Text>
          <Text style={netProfit < 0 ? styles.calcValRed : styles.calcValGreen}>
            R$ {netProfit.toFixed(2)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.calcLabel}>Margem Líquida:</Text>
          <Text style={styles.calcValBlue}>{Math.round(margin)}%</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleSave}>
        <Text style={styles.btnText}>Concluir e Salvar Rota</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19', padding: 20 },
  title: { fontSize: 22, fontFamily: 'Outfit', fontWeight: '800', color: '#F8FAFC', marginBottom: 20, marginTop: 24 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, color: '#CBD5E1', marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: '#1F293D', borderRadius: 10, padding: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  calcCard: { backgroundColor: '#161C2C', borderRadius: 12, padding: 16, marginTop: 12, borderLeftWidth: 4, borderLeftColor: '#10B981', borderStyle: 'solid' },
  calcTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  calcLabel: { color: '#94A3B8', fontSize: 13 },
  calcValRed: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
  calcValGreen: { color: '#10B981', fontWeight: '700', fontSize: 14 },
  calcValBlue: { color: '#3B82F6', fontWeight: '700', fontSize: 14 },
  btn: { backgroundColor: '#10B981', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 }
});
```

---

## 5. Estratégias Completas de Monetização (SaaS)

Para transformar o **RotaLucro** em um negócio recorrente lucrativo nas lojas de aplicativos, propõe-se as seguintes frentes de monetização:

### A. Modelo Freemium (Assinatura Recorrente In-App)
Oferece um plano gratuito básico e limita funcionalidades avançadas de alto valor na assinatura **Driver Finance Pro** por **R$ 9,90/mês** (ou R$ 79,90/ano):
- **Gratuito:** Registro de até 15 rotas por mês, cadastro de 1 veículo, e gráficos básicos de 7 dias.
- **Premium (Pro):**
  - Rotas e plataformas ilimitadas.
  - Sincronização automática e backup em nuvem permanente (Supabase).
  - Alertas mecânicos automáticos avançados (IPVA, óleo, freios) e múltiplos veículos.
  - Simulador inteligente completo de combustível e faturamento necessário.
  - Relatórios avançados exportáveis em PDF detalhado e planilhas Excel (CSV).
  - Experiência premium livre de anúncios.

### B. Integrações de Afiliados (B2B)
Parcerias comerciais com empresas automotivas e de seguros, gerando comissões in-app:
- **Seguros para Entregadores:** Cotação rápida de seguro auto direto na aba "Carro", gerando comissão de venda para o app.
- **Oficinas de Manutenção:** Ao acender o alerta de "Troca de Óleo" ou "Troca de Pastilhas de Freio", o aplicativo recomenda oficinas parceiras na cidade do usuário, oferecendo cupons de desconto exclusivos e recebendo taxa de indicação.
- **Microcrédito Automotivo:** Parceria com fintechs para oferecer crédito rápido de conserto de veículos para motoristas que dependem do carro para trabalhar e não podem parar a produção por falta de caixa.

### C. Anúncios Nativo Otimizados
Para a base de usuários no plano gratuito, exibe anúncios em formatos não intrusivos (ex: banners integrados no Dashboard simulando cards do aplicativo) focados na realidade do motorista (postos de gasolina, acessórios de suporte de celular, marcas de pneus, lubrificantes).
