/**
 * Playbook 90 dias: cada "mês" = 30 dias (1–30, 31–60, 61–90).
 * Uma atividade aparece no mês se o intervalo [start, start+duration-1] interceptar esse bloco
 * (não só se start cair dentro — evita Mês 3 vazio para tarefas longas).
 */
export function activityOverlapsPlaybookMonth(
  start: number,
  duration: number,
  monthIndex1To3: number
): boolean {
  const dur = Number.isFinite(duration) && duration > 0 ? duration : 1;
  const monthStart = (monthIndex1To3 - 1) * 30 + 1;
  const monthEnd = monthIndex1To3 * 30;
  const actEnd = start + dur - 1;
  return start <= monthEnd && actEnd >= monthStart;
}
