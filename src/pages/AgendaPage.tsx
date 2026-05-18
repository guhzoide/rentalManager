import { useState, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { toast } from 'react-toastify';
import { DataGrid, Column } from '@/components/ui/DataGrid';
import { AgendaForm } from '@/components/forms/AgendaForm';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { agendaSchema } from '@/lib/schemas';

dayjs.locale('pt-br');

interface SelectedItemState {
    itemId: string;
    quantidade: number;
}

interface AgendaItem {
    id: string;
    data: string;
    dataColeta: string;
    observacao?: string;
    desconto?: number;
    valorTotal?: number;
    itens: { id: string; itemId: string; quantidade: number; estoques: { nome: string; valorDiaria?: number } }[];
    cliente: { id: string; nome: string };
    endereco: { id: string; rua: string; numero: string; cep: string };
}

interface SelectItem { id: string; nome: string; disponivel?: number; valorDiaria?: number; }
interface SelectEndereco { id: string; rua: string; numero: string; cep: string; clienteId: string; }

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const agendaColumns: Column<AgendaItem>[] = [
    {
        key: 'itens',
        label: 'Itens Locados',
        render: (_, row) => row.itens?.map(i => `${i.quantidade}x ${i.estoques?.nome}`).join(', ') || '—'
    },
    { key: 'cliente', label: 'Cliente', render: (_, row) => row.cliente?.nome },
    {
        key: 'dataColeta',
        label: 'Entrega ➜ Coleta',
        render: (_, row) => {
            const ent = dayjs(row.data).format('DD/MM HH:mm');
            const col = dayjs(row.dataColeta).format('DD/MM HH:mm');
            return `${ent} ➜ ${col}`;
        }
    },
    {
        key: 'valorTotal',
        label: 'Total',
        render: (_, row) => {
            const val = row.valorTotal ?? 0;
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
        }
    },
    { key: 'observacao', label: 'Observações', render: (_, row) => row.observacao || '—' },
];

export function AgendaPage() {
    const today = dayjs();
    const [current, setCurrent] = useState(today);
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
    const [selectedAgenda, setSelectedAgenda] = useState<AgendaItem | null>(null);

    const utils = trpc.useUtils();

    // Form state
    const [selectedItens, setSelectedItens] = useState<SelectedItemState[]>([]);
    const [clienteId, setClienteId] = useState('');
    const [enderecoId, setEnderecoId] = useState('');
    const [observacao, setObservacao] = useState('');
    const [dataStr, setDataStr] = useState('');
    const [dataColetaStr, setDataColetaStr] = useState('');
    const [desconto, setDesconto] = useState(0);

    const [formMode, setFormMode] = useState<'view' | 'list' | 'new' | 'edit'>('view');
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // Queries
    const { data: agendasRes } = trpc.agendas.list.useQuery({
        pagina: 1,
        limit: 100,
        filtros: {
            data: {
                gte: current.startOf('month').toISOString(),
                lte: current.endOf('month').toISOString(),
            }
        }
    });

    const { data: itensRes } = trpc.estoque.list.useQuery({ limit: 200 });
    const { data: clientesRes } = trpc.clientes.list.useQuery({ limit: 200 });
    const { data: enderecosRes } = trpc.enderecos.list.useQuery({ limit: 500 });

    const agendas = useMemo(() => {
        return (agendasRes?.data || []).map((a: any) => ({
            id: a.id,
            data: a.data,
            dataColeta: a.dataColeta,
            observacao: a.observacao || '',
            desconto: a.desconto ?? 0,
            valorTotal: a.valorTotal ?? 0,
            itens: a.itens || [],
            cliente: { id: a.clientes?.id, nome: a.clientes?.nome },
            endereco: { id: a.enderecos?.id, rua: a.enderecos?.rua, numero: a.enderecos?.numero, cep: a.enderecos?.cep }
        })) as AgendaItem[];
    }, [agendasRes]);

    const itens = (itensRes?.data || []) as unknown as SelectItem[];
    const clientes = (clientesRes?.data || []) as unknown as SelectItem[];
    const enderecos = (enderecosRes?.data || []) as unknown as SelectEndereco[];

    const valorTotalCalculado = useMemo(() => {
        if (!dataStr || !dataColetaStr) return 0;
        const d1 = dayjs(dataStr);
        const d2 = dayjs(dataColetaStr);
        if (!d1.isValid() || !d2.isValid()) return 0;

        const diffHours = d2.diff(d1, 'hour');
        const diffDays = Math.max(1, Math.ceil(diffHours / 24));

        let itemsSum = 0;
        for (const item of selectedItens) {
            if (!item.itemId) continue;
            const fullItem = itens.find(i => i.id === item.itemId);
            const price = fullItem?.valorDiaria ?? 0;
            itemsSum += price * item.quantidade;
        }

        const totalBruto = itemsSum * diffDays;
        const discountFactor = (100 - desconto) / 100;
        return totalBruto * discountFactor;
    }, [selectedItens, dataStr, dataColetaStr, desconto, itens]);

    // Mutations
    const saveMutation = trpc.agendas.create.useMutation({
        onSuccess: () => {
            toast.success('Agendamento salvo com sucesso!', { theme: 'colored' });
            utils.agendas.list.invalidate();
            utils.estoque.list.invalidate();
            setFormMode('list');
        },
        onError: (err) => toast.error(`Erro: ${err.message}`, { theme: 'colored' }),
    });

    const updateMutation = trpc.agendas.update.useMutation({
        onSuccess: () => {
            toast.success('Agendamento salvo com sucesso!', { theme: 'colored' });
            utils.agendas.list.invalidate();
            utils.estoque.list.invalidate();
            setFormMode('list');
        },
        onError: (err) => toast.error(`Erro: ${err.message}`, { theme: 'colored' }),
    });

    const deleteMutation = trpc.agendas.delete.useMutation({
        onSuccess: () => {
            setSelectedAgenda(null);
            setFormMode('list');
            utils.agendas.list.invalidate();
            utils.estoque.list.invalidate();
        },
        onError: (err) => toast.error(`Erro: ${err.message}`, { theme: 'colored' }),
    });

    // Filtra endereços pelo cliente selecionado
    const filteredEnderecos = useMemo(() => {
        if (!clienteId) return [];
        return enderecos.filter((e) => e.clienteId === clienteId);
    }, [clienteId, enderecos]);

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

    const handleDayClick = (date: dayjs.Dayjs) => {
        setSelectedDate(date);
        setFormMode('list');
    };

    const handleAddClick = () => {
        setSelectedAgenda(null);
        setSelectedItens([{ itemId: '', quantidade: 1 }]);
        setClienteId('');
        setEnderecoId('');
        setObservacao('');
        setDesconto(0);
        if (selectedDate) {
            setDataStr(selectedDate.hour(8).minute(0).format('YYYY-MM-DDTHH:mm'));
            setDataColetaStr(selectedDate.hour(18).minute(0).format('YYYY-MM-DDTHH:mm'));
        }
        setFormMode('new');
    };

    const handleEditClick = (row: AgendaItem) => {
        setSelectedAgenda(row);
        setSelectedItens(row.itens.map(i => ({ itemId: i.itemId, quantidade: i.quantidade })));
        setClienteId(String(row.cliente.id));
        setEnderecoId(String(row.endereco.id));
        setObservacao(row.observacao || '');
        setDesconto(row.desconto ?? 0);
        setDataStr(dayjs(row.data).format('YYYY-MM-DDTHH:mm'));
        setDataColetaStr(dayjs(row.dataColeta).format('YYYY-MM-DDTHH:mm'));
        setFormMode('edit');
    };

    const handleSave = () => {
        // Validação via Zod
        const parseResult = agendaSchema.safeParse({
            data: dataStr ? new Date(dataStr) : undefined,
            dataColeta: dataColetaStr ? new Date(dataColetaStr) : undefined,
            clienteId,
            enderecoId,
            observacao,
            itens: selectedItens,
            desconto,
            valorTotal: valorTotalCalculado,
        });

        if (!parseResult.success) {
            const fieldErrors: Record<string, string> = {};
            for (const issue of parseResult.error.issues) {
                const path = issue.path.join('_') || 'geral';
                fieldErrors[path] = issue.message;
            }
            setFormErrors(fieldErrors);
            toast.error('Corrija os campos destacados antes de salvar.', { theme: 'colored' });
            return;
        }

        // Validar se data de coleta é posterior à data de entrega
        if (dayjs(dataColetaStr).isBefore(dayjs(dataStr))) {
            setFormErrors({ dataColeta: 'A data de coleta deve ser posterior à data de entrega.' });
            toast.error('A data/hora da coleta deve ser posterior à data/hora de entrega.', { theme: 'colored' });
            return;
        }

        setFormErrors({});

        const payload: any = {
            data: new Date(dataStr).toISOString(),
            dataColeta: new Date(dataColetaStr).toISOString(),
            clienteId,
            enderecoId,
            observacao,
            itens: selectedItens,
            desconto,
            valorTotal: valorTotalCalculado,
        };

        if (selectedAgenda?.id) {
            updateMutation.mutate({ id: selectedAgenda.id, data: payload });
        } else {
            saveMutation.mutate(payload);
        }
    };

    const days = buildCalendarDays();

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

                {/* List */}
                {formMode === 'list' && selectedDate && (
                    <div className="agenda-form-card">
                        <div className="agenda-form-title">
                            Agendamentos do Dia
                            {' — '}
                            <span style={{ color: 'var(--accent-hover)', fontWeight: 400 }}>
                                {selectedDate.format('DD/MM/YYYY')}
                            </span>
                        </div>
                        <div style={{ marginTop: 16 }}>
                            <DataGrid
                                columns={agendaColumns}
                                data={agendas.filter(a => dayjs(a.data).format('YYYY-MM-DD') === selectedDate.format('YYYY-MM-DD'))}
                                onAdd={handleAddClick}
                                onRowClick={handleEditClick}
                                emptyText="Nenhum agendamento para esta data."
                            />
                        </div>
                    </div>
                )}

                {/* Form */}
                {(formMode === 'new' || formMode === 'edit') && selectedDate && (
                    <div className="agenda-form-card">
                        <div className="agenda-form-title">
                            {formMode === 'new' ? '➕ Novo Agendamento' : '✏️ Editar Agendamento'}
                            {' — '}
                            <span style={{ color: 'var(--accent-hover)', fontWeight: 400 }}>
                                {selectedDate.format('DD/MM/YYYY')}
                            </span>
                        </div>

                        <AgendaForm
                            selectedItens={selectedItens}
                            setSelectedItens={setSelectedItens}
                            clienteId={clienteId}
                            setClienteId={setClienteId}
                            enderecoId={enderecoId}
                            setEnderecoId={setEnderecoId}
                            observacao={observacao}
                            setObservacao={setObservacao}
                            data={dataStr}
                            setData={setDataStr}
                            dataColeta={dataColetaStr}
                            setDataColeta={setDataColetaStr}
                            desconto={desconto}
                            setDesconto={setDesconto}
                            valorTotalCalculado={valorTotalCalculado}
                            itens={itens}
                            clientes={clientes}
                            filteredEnderecos={filteredEnderecos}
                            errors={formErrors}
                        />

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                            {formMode === 'edit' && selectedAgenda && (
                                <button
                                    className="btn btn-danger"
                                    onClick={() => {
                                        triggerConfirm(
                                            'Remover agendamento',
                                            'Tem certeza que deseja remover este agendamento? Os itens retornarão ao estoque disponível.',
                                            () => deleteMutation.mutate({ id: selectedAgenda.id })
                                        );
                                    }}
                                >
                                    🗑 Remover
                                </button>
                            )}
                            <button
                                className="btn btn-ghost"
                                onClick={() => setFormMode('list')}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={saveMutation.isPending || updateMutation.isPending}
                            >
                                {saveMutation.isPending || updateMutation.isPending ? 'Salvando...' : '💾 Salvar'}
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
                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                />
            </div>
        </div>
    );
}
