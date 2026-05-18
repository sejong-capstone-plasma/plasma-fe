export function formatUnit(unit: string): string {
    return unit
      .replace(/\^-2/g, '⁻²')
      .replace(/\^-1/g, '⁻¹')
      .replace(/\^-3/g, '⁻³')
      .replace(/\^2/g, '²')
      .replace(/\^3/g, '³')
      .replace(/\^0/g, '⁰')
      .replace(/-2/g, '⁻²')   
      .replace(/-1/g, '⁻¹');
  }

  export function formatValue(value: number): string {
    if (Math.abs(value) >= 1e13) return value.toExponential(2);
    if (Math.abs(value) >= 1000) return value.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
    return Number(value.toFixed(3)).toString();
  }