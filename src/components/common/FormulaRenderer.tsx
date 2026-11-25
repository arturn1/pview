import React from 'react';

interface FormulaRendererProps {
  formula: string;
  className?: string;
}

/**
 * Renderizador de fórmulas matemáticas elegante e sem dependências pesadas.
 * Converte LaTeX comum (\times, subscritos, divisões) em elementos tipográficos ricos.
 */
export const FormulaRenderer: React.FC<FormulaRendererProps> = ({ formula, className = '' }) => {
  // Processamento simples para renderizar subscritos como _{xyz} -> <sub>xyz</sub>
  const renderFormattedFormula = (text: string) => {
    // Substitui \times por ×
    let clean = text.replace(/\\times/g, ' × ');

    // Divide em tokens preservando blocos de subscrito _{...}
    const parts = clean.split(/(_\{[a-zA-Z0-9_,]+\})/g);

    return parts.map((part, index) => {
      if (part.startsWith('_{') && part.endsWith('}')) {
        const subContent = part.slice(2, -1);
        return (
          <sub key={index} className="text-[11px] font-sans font-bold text-slate-500 ml-0.5">
            {subContent}
          </sub>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div
      className={`font-mono text-sm tracking-wide font-semibold text-slate-800 flex items-center justify-center flex-wrap gap-1 ${className}`}
    >
      {renderFormattedFormula(formula)}
    </div>
  );
};
