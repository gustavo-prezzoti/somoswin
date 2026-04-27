/**
 * Rótulo legível do canal calculado no diagnóstico (mesmos valores que o backend
 * em {@code StrategicDiagnosisMetricsCalculator#canalPrioritario}).
 */
const CANAL_KEY_LABELS: Record<string, string> = {
  google: 'Google',
  meta: 'Meta',
  google_e_meta: 'Google e Meta',
  sales_first: 'Vendas (prioridade comercial)',
  reativacao_base: 'Reativação da base',
};

export function formatStrategicCanalLabel(key: string | null | undefined): string {
  const k = (key || '').trim();
  if (!k) return '—';
  if (CANAL_KEY_LABELS[k]) return CANAL_KEY_LABELS[k];
  return k
    .split(/_+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase('pt-BR') + w.slice(1).toLowerCase())
    .join(' ');
}
