// Mantém os valores vinculados à locação mesmo fora do lote de opções carregado.
// Quando a consulta contém o registro, seus dados mais recentes têm prioridade.
export function mergeAgendaOptions<T extends { id: string }>(options: T[], selected: T[]): T[] {
    return [...new Map([...selected, ...options].map((option) => [option.id, option])).values()];
}
