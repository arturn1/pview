import { useState, useMemo, useEffect } from 'react';
import { Calculation, CalculationVariable } from '../../types';
import { Play, RotateCcw, Sparkles } from 'lucide-react';

interface FormulaSimulatorProps {
  calculation: Calculation;
}

function normalizeFormulaSymbols(formula: string): string {
  return formula
    .replace(/_\{([a-zA-Z0-9,]+)\}/g, '_$1')
    .replace(/\\left|\\right/g, '');
}

/**
 * Avaliador dinâmico e seguro de expressões aritméticas matemáticas.
 */
function evaluateMathExpression(expr: string, scope: Record<string, number>): number | null {
  try {
    // Limpa tokens comuns de LaTeX
    let cleaned = normalizeFormulaSymbols(expr)
      .replace(/\\times/g, '*')
      .replace(/\\cdot/g, '*')
      .replace(/÷/g, '/')
      .replace(/×/g, '*')
      .replace(/\^/g, '**');

    // Substitui variáveis pelo valor numérico correspondente
    // Ordena por tamanho decrescente para não substituir substrings de identificadores maiores
    const symbols = Object.keys(scope).sort((a, b) => b.length - a.length);

    for (const sym of symbols) {
      const val = scope[sym] ?? 0;
      // Regex com word boundary
      const escapedSymbol = sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![a-zA-Z0-9_])${escapedSymbol}(?![a-zA-Z0-9_])`, 'g');
      cleaned = cleaned.replace(regex, `(${val})`);
    }

    // Permite estritamente números e operadores matemáticos seguros
    if (!/^[0-9+\-*/().\s*]+$/.test(cleaned)) {
      return null;
    }

    // Execução segura da expressão aritmética simples
    const result = new Function(`"use strict"; return (${cleaned});`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

export function FormulaSimulator({ calculation }: FormulaSimulatorProps) {
  // Separa o símbolo resultante da expressão (ex: "C = H * V" -> result="C", expr="H * V")
  const { resultSymbol, mathExpr } = useMemo(() => {
    const raw = calculation.formula;
    if (raw.includes('=')) {
      const [left, ...rest] = raw.split('=');
      return {
        resultSymbol: normalizeFormulaSymbols(left.trim()).replace(/[{}]/g, ''),
        mathExpr: normalizeFormulaSymbols(rest.join('=').trim()),
      };
    }
    return {
      resultSymbol: 'Resultado',
      mathExpr: normalizeFormulaSymbols(raw.trim()),
    };
  }, [calculation.formula]);

  // Detecta variáveis da fórmula caso não tenham sido pré-cadastradas
  const activeVariables = useMemo<CalculationVariable[]>(() => {
    if (calculation.variables && calculation.variables.length > 0) {
      return calculation.variables;
    }

    // Extrai palavras que parecem variáveis
    const tokens = mathExpr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    const unique = Array.from(new Set(tokens)).filter(t => t !== resultSymbol);

    return unique.map(sym => ({
      symbol: sym,
      name: sym,
      unit: '',
    }));
  }, [calculation.variables, mathExpr, resultSymbol]);

  // Valores padrão de inicialização
  const defaultValues = useMemo<Record<string, number>>(() => {
    // Valores especiais para o sistema piloto
    if (calculation.id === 'calc_cc_1') return { H: 80, V_hora: 65 };
    if (calculation.id === 'calc_dp_1') return { C_total: 42000, O: 50000 };
    if (calculation.id === 'calc_cs_1') return { CargaSemanal: 40, H_alocadas: 130 };

    const defs: Record<string, number> = {};
    activeVariables.forEach(v => {
      defs[v.symbol] = 10;
    });
    return defs;
  }, [calculation.id, activeVariables]);

  const [values, setValues] = useState<Record<string, number>>(defaultValues);

  useEffect(() => {
    setValues(defaultValues);
  }, [defaultValues]);

  const handleInputChange = (symbol: string, val: string) => {
    const num = parseFloat(val);
    setValues(prev => ({
      ...prev,
      [symbol]: isNaN(num) ? 0 : num,
    }));
  };

  const resetValues = () => setValues(defaultValues);

  // Calcula o resultado dinâmico em tempo real
  const computedResult = useMemo(() => {
    const calculatedNum = evaluateMathExpression(mathExpr, values);
    if (calculatedNum === null) {
      return null;
    }

    let formatted = calculatedNum.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    let isWarning = false;
    let isCritical = false;

    // Regras de formatação especiais
    if (resultSymbol.includes('C') || resultSymbol.toLowerCase().includes('custo') || resultSymbol.toLowerCase().includes('total')) {
      formatted = calculatedNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else if (resultSymbol === 'P' || calculation.formula.includes('100')) {
      formatted = `${calculatedNum.toFixed(1)}%`;
      isWarning = calculatedNum > 80 && calculatedNum <= 100;
      isCritical = calculatedNum > 100;
    } else if (resultSymbol.includes('H') || resultSymbol.toLowerCase().includes('horas')) {
      formatted = `${calculatedNum} horas`;
      isCritical = calculatedNum < 0;
    }

    return {
      symbol: resultSymbol,
      formatted,
      raw: calculatedNum,
      isWarning,
      isCritical,
    };
  }, [mathExpr, values, resultSymbol, calculation.formula]);

  return (
    <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/20 p-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
          <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
          Simulador Interativo Dinâmico
        </span>
        <button
          onClick={resetValues}
          title="Restaurar valores padrão"
          className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Restaurar
        </button>
      </div>

      {/* Variáveis Dinâmicas */}
      <div className="grid grid-cols-2 gap-3">
        {activeVariables
          .filter(v => v.symbol !== resultSymbol)
          .map(v => (
            <div key={v.symbol} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span className="font-semibold truncate max-w-[120px]">{v.name || v.symbol}</span>
                <span className="font-mono text-slate-400">({v.symbol})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={values[v.symbol] ?? 0}
                  onChange={e => handleInputChange(v.symbol, e.target.value)}
                  className="w-full text-xs font-mono font-bold text-slate-800 bg-slate-50 px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {v.unit && (
                  <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                    {v.unit}
                  </span>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Resultado Calculado */}
      {computedResult ? (
        <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {computedResult.symbol} (Resultado Calculado)
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-base font-extrabold text-emerald-700 font-mono">
                {computedResult.formatted}
              </span>
              {computedResult.isCritical && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                  ⚠️ Limite Excedido
                </span>
              )}
              {computedResult.isWarning && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                  ⚠️ Alerta (≥ 80%)
                </span>
              )}
            </div>
          </div>

          <div className="text-right text-[11px] text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Cálculo ao vivo</span>
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-400 italic p-2 bg-slate-50 rounded text-center">
          Preencha a fórmula com operadores matemáticos (+, -, *, /) para simular.
        </div>
      )}
    </div>
  );
}
