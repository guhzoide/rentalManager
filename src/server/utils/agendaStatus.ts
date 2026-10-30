export const AGENDA_WARNING_MS = 60 * 60 * 1000;

interface RentalStatus {
    data: Date;
    dataColeta: Date;
    entregue: boolean;
    concluida: boolean; // Confirmação de coleta.
}

// Executado no servidor: o relógio e o fuso do navegador não definem os alertas.
export function agendaStatus(rental: RentalStatus, now = Date.now()) {
    if (rental.entregue && rental.concluida) {
        return { cor: 'success', texto: 'Entregue e coletada' } as const;
    }
    const pending = [
        ...(!rental.entregue ? [{ nome: 'Entrega', at: rental.data.getTime() }] : []),
        ...(!rental.concluida ? [{ nome: 'Coleta', at: rental.dataColeta.getTime() }] : []),
    ].sort((a, b) => a.at - b.at);
    const overdue = pending.filter((event) => event.at < now);
    if (overdue.length) {
        return { cor: 'danger', texto: `${overdue.map((event) => event.nome).join(' e ')} em atraso` } as const;
    }
    const next = pending[0];
    if (next.at - now <= AGENDA_WARNING_MS) {
        return { cor: 'warning', texto: `${next.nome} em até 1 hora` } as const;
    }
    return { cor: 'pending', texto: `${next.nome} pendente` } as const;
}
