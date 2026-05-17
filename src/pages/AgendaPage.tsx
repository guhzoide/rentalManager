import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { toast } from 'react-toastify';

dayjs.locale('pt-br');

interface AgendaItem {
    id: number;
    data: string;
    observacao?: string;
    estoques: { id: number; nome: string };
    clientes: { id: number; nome: string };
    enderecos: { id: number; rua: string; numero: string; cep: string };
}

interface SelectEndereco {
    id: number;
    rua: string;
    numero: string;
    cep: string;
    clienteId: number;
    complemento?: string | null;
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function AgendaPage() {
    const today = dayjs();
    const [current, setCurrent] = useState(today);
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
    const [selectedAgenda, setSelectedAgenda] = useState<AgendaItem | null>(null);

    // Form state
    const [itemId, setItemId] = useState('');
    const [clienteId, setClienteId] = useState('');
    const [enderecoId, setEnderecoId] = useState('');
    const [observacao, setObservacao] = useState('');

    const [formMode, setFormMode] = useState<'view' | 'new' | 'edit'>('view');

    const [filteredEnderecos, setFilteredEnderecos] = useState<SelectEndereco[]>([]);

    const utils = trpc.useUtils();

    // Queries (Combos)
    const { data: itensRes } = trpc.estoque.list.useQuery({ limit: 20 });
    const { data: clientesRes } = trpc.clientes.list.useQuery({ limit: 20 });
    const { data: enderecosRes } = trpc.enderecos.byClienteId.useQuery(
        { clienteId: Number(clienteId) },
        { enabled: !!clienteId }
    );

    const itens = itensRes?.data || [];
    const clientes = clientesRes?.data || [];

    // Query (Agenda do mês)
    const { data: agendaRes, isLoading: isLoadingAgenda } = trpc.agendas.list.useQuery({
        filtros: {
            data: {
                gte: current.startOf('month').toISOString(),
                lte: current.endOf('month').toISOString(),
            }
        },
        limit: 100
    });

    const agendas = (agendaRes?.data || []) as unknown as AgendaItem[];

    // Mutations
    const createMutation = trpc.agendas.create.useMutation({
        onSuccess: () => {
            toast.success('Agendamento salvo!');
            utils.agendas.list.invalidate();
        },
        onError: (err) => toast.error(err.message),
    });

    const updateMutation = trpc.agendas.update.useMutation({
        onSuccess: () => {
            toast.success('Agendamento atualizado!');
            utils.agendas.list.invalidate();
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteMutation = trpc.agendas.delete.useMutation({
        onSuccess: () => {
            toast.success('Agendamento removido!');
            setSelectedAgenda(null);
            setFormMode('view');
            utils.agendas.list.invalidate();
        },
        onError: (err) => toast.error(err.message),
    });


    // Filtra endereços pelo cliente selecionado dinamicamente
    useEffect(() => {
        if (!clienteId) {
            setFilteredEnderecos([]);
            setEnderecoId('');
        } else {
            const filtered = (enderecosRes || []) as unknown as SelectEndereco[];
            setFilteredEnderecos(filtered);
            
            // Só reseta o endereço se o endereço selecionado atualmente não for válido para o cliente
            const isValid = filtered.some((e) => String(e.id) === enderecoId);
            if (!isValid) {
                setEnderecoId('');
            }
        }
    }, [clienteId, enderecosRes, enderecoId]);

    // Mapa de datas com eventos
    const eventDates = new Set(agendas.map((a) => dayjs(a.data).format('YYYY-MM-DD')));

    const buildCalendarDays = () => {
        const start = current.startOf('month');
        const end = current.endOf('month');
        const startWeekday = start.day();

        const days: { date: dayjs.Dayjs; isCurrentMonth: boolean }[] = [];

        // Dias do mês anterior
        for (let i = startWeekday - 1; i >= 0; i--) {
            days.push({ date: start.subtract(i + 1, 'day'), isCurrentMonth: false });
        }

        // Dias do mês atual
        for (let d = 0; d < end.date(); d++) {
            days.push({ date: start.add(d, 'day'), isCurrentMonth: true });
        }

        // Completar 6 semanas
        while (days.length % 7 !== 0) {
            days.push({ date: days[days.length - 1].date.add(1, 'day'), isCurrentMonth: false });
        }

        return days;
    };

    const days = buildCalendarDays();

    const handleDayClick = (date: dayjs.Dayjs) => {
        setSelectedDate(date);

        // Verifica se já tem agendamento nessa data
        const existing = agendas.find((a) => dayjs(a.data).format('YYYY-MM-DD') === date.format('YYYY-MM-DD'));

        if (existing) {
            setSelectedAgenda(existing);
            setItemId(String(existing.estoques.id));
            setClienteId(String(existing.clientes.id));
            setEnderecoId(String(existing.enderecos.id));
            setObservacao(existing.observacao || '');
            setFormMode('edit');
        } else {
            setSelectedAgenda(null);
            setItemId('');
            setClienteId('');
            setEnderecoId('');
            setObservacao('');
            setFormMode('new');
        }
    };

    const handleSave = () => {
        if (!selectedDate) return;

        const payload = {
            data: selectedDate.toDate(),
            itemId: Number(itemId),
            clienteId: Number(clienteId),
            enderecoId: Number(enderecoId),
            observacao,
        };

        if (selectedAgenda?.id) {
            updateMutation.mutate({ id: selectedAgenda.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };


    return (
        <div className="page-inner">
            <div className="page-header">
                <h2>📅 Agenda</h2>
                <p>Clique em uma data para ver ou criar um agendamento</p>
            </div>

            <div className="agenda-layout">
                {/* Calendar */}
                <div className="calendar-card">
                    <div className="calendar-header">
                        <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => setCurrent(current.subtract(1, 'month'))}
                        >
                            ‹
                        </button>
                        <span className="calendar-month-title">
                            {MONTHS[current.month()]} {current.year()}
                        </span>
                        <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => setCurrent(current.add(1, 'month'))}
                        >
                            ›
                        </button>
                    </div>

                    <div className="calendar-grid">
                        <div className="calendar-weekdays">
                            {DAYS.map((d) => (
                                <div key={d} className="calendar-weekday">{d}</div>
                            ))}
                        </div>

                        <div className="calendar-days">
                            {days.map(({ date, isCurrentMonth }, idx) => {
                                const key = date.format('YYYY-MM-DD');
                                const isToday = date.isSame(today, 'day');
                                const isSelected = selectedDate?.isSame(date, 'day');
                                const hasEvent = eventDates.has(key);

                                let cls = 'calendar-day';
                                if (!isCurrentMonth) cls += ' other-month';
                                if (isToday) cls += ' today';
                                if (isSelected) cls += ' selected';
                                if (hasEvent) cls += ' has-event';

                                return (
                                    <button
                                        key={idx}
                                        className={cls}
                                        onClick={() => handleDayClick(date)}
                                    >
                                        {date.date()}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Form */}
                {formMode !== 'view' && selectedDate && (
                    <div className="agenda-form-card">
                        <div className="agenda-form-title">
                            {formMode === 'new' ? '➕ Novo Agendamento' : '✏️ Editar Agendamento'}
                            {' — '}
                            <span style={{ color: 'var(--accent-hover)', fontWeight: 400 }}>
                                {selectedDate.format('DD/MM/YYYY')}
                            </span>
                        </div>

                        <div className="form-grid single">
                            <div className="form-group">
                                <label className="form-label">Item para Locação *</label>
                                <select
                                    className="form-control"
                                    value={itemId}
                                    onChange={(e) => setItemId(e.target.value)}
                                >
                                    <option value="">Selecione um item...</option>
                                    {itens.map((i) => (
                                        <option key={i.id} value={i.id}>{i.nome}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Cliente *</label>
                                <select
                                    className="form-control"
                                    value={clienteId}
                                    onChange={(e) => setClienteId(e.target.value)}
                                >
                                    <option value="">Selecione um cliente...</option>
                                    {clientes.map((c) => (
                                        <option key={c.id} value={c.id}>{c.nome}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Endereço do Cliente *</label>
                                <select
                                    className="form-control"
                                    value={enderecoId}
                                    onChange={(e) => setEnderecoId(e.target.value)}
                                    disabled={!clienteId}
                                >
                                    <option value="">
                                        {!clienteId
                                            ? 'Selecione um cliente primeiro...'
                                            : filteredEnderecos.length === 0
                                                ? 'Nenhum endereço cadastrado'
                                                : 'Selecione o endereço...'}
                                    </option>
                                    {filteredEnderecos.map((e) => (
                                        <option key={e.id} value={e.id}>
                                            {e.rua}, {e.numero} {e.complemento ? `(${e.complemento})` : ''} — CEP {e.cep}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Observação</label>
                                <textarea
                                    className="form-control"
                                    value={observacao}
                                    onChange={(e) => setObservacao(e.target.value)}
                                    placeholder="Observações adicionais..."
                                    rows={3}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                            {selectedAgenda?.id && (
                                <button
                                    className="btn btn-danger"
                                    onClick={() => {
                                        if (confirm('Remover este agendamento?')) {
                                            deleteMutation.mutate({ id: selectedAgenda.id as number });
                                        }
                                    }}
                                >
                                    🗑 Remover
                                </button>
                            )}

                            <button
                                className="btn btn-ghost"
                                onClick={() => { setFormMode('view'); setSelectedDate(null); }}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : '💾 Salvar'}
                            </button>

                        </div>
                    </div>
                )}

                {formMode === 'view' && (
                    <div className="agenda-form-card" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
                            <p>Clique em uma data no calendário</p>
                            <p style={{ fontSize: 12, marginTop: 4 }}>Datas com <span style={{ color: 'var(--success)' }}>●</span> possuem agendamentos</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
