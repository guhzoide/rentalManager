import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import Switch from '@mui/material/Switch';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { toast } from 'react-toastify';
import { DataGrid, Column } from '@/components/ui/DataGrid';
import { AgendaForm } from '@/components/forms/AgendaForm';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Modal } from '@/components/ui/Modal';
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
    frete?: number;
    valorTotal?: number;
    concluida: boolean;
    itens: { id: string; itemId: string; quantidade: number; estoques: { nome: string; valorDiaria?: number } }[];
    cliente: { id: string; nome: string };
    endereco: { id: string; rua: string; numero: string; bairro?: string | null; cep: string };
}

interface SelectItem { id: string; nome: string; disponivel?: number; valorDiaria?: number; }
interface SelectEndereco { id: string; rua: string; numero: string; bairro?: string | null; cep: string; clienteId: string; }

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function getAgendaColumns(onCompletionChange: (agenda: AgendaItem, concluida: boolean) => void): Column<AgendaItem>[] {
    return [
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
    {
        key: 'concluida',
        label: 'Concluída',
        width: '110px',
        render: (_, row) => (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={(event) => event.stopPropagation()}>
                <Switch
                    checked={row.concluida ?? false}
                    style={{ color: 'var(--text-primary)' }}
                    onChange={(event) => onCompletionChange(row, event.target.checked)}
                />
                {/* <span>{row.concluida ? 'Sim' : 'Não'}</span> */}
            </label>
        ),
    },
];
}

export function AgendaPage() {
    const today = dayjs();
    const [current, setCurrent] = useState(today);
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
    const [selectedAgenda, setSelectedAgenda] = useState<AgendaItem | null>(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const utils = trpc.useUtils();

    // Form state
    const [selectedItens, setSelectedItens] = useState<SelectedItemState[]>([]);
    const [clienteId, setClienteId] = useState('');
    const [enderecoId, setEnderecoId] = useState('');
    const [observacao, setObservacao] = useState('');
    const [dataStr, setDataStr] = useState('');
    const [dataColetaStr, setDataColetaStr] = useState('');
    const [desconto, setDesconto] = useState(0);
    const [frete, setFrete] = useState(0);

    const [formMode, setFormMode] = useState<'list' | 'new' | 'edit'>('list');
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
            frete: a.frete ?? 0,
            valorTotal: a.valorTotal ?? 0,
            concluida: a.concluida ?? false,
            itens: a.itens || [],
            cliente: { id: a.clientes?.id, nome: a.clientes?.nome },
            endereco: {
                id: a.enderecos?.id,
                rua: a.enderecos?.rua,
                numero: a.enderecos?.numero,
                bairro: a.enderecos?.bairro,
                cep: a.enderecos?.cep,
            }
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
        return (totalBruto * discountFactor) + frete;
    }, [selectedItens, dataStr, dataColetaStr, desconto, frete, itens]);

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

    const completionMutation = trpc.agendas.update.useMutation({
        onSuccess: () => {
            toast.success('Status da locação atualizado!', { theme: 'colored' });
            utils.agendas.list.invalidate();
            utils.estoque.list.invalidate();
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

    const agendaColumns = useMemo(
        () => getAgendaColumns((agenda, concluida) => completionMutation.mutate({ id: agenda.id, data: { concluida } })),
        [completionMutation],
    );

    // Filtra endereços pelo cliente selecionado
    const filteredEnderecos = useMemo(() => {
        if (!clienteId) return [];
        return enderecos.filter((e) => e.clienteId === clienteId);
    }, [clienteId, enderecos]);

    const eventDates = new Set(agendas.map((agenda) => dayjs(agenda.data).format('YYYY-MM-DD')));

    const buildCalendarDays = () => {
        const start = current.startOf('month');
        const end = current.endOf('month');
        const days: { date: dayjs.Dayjs; isCurrentMonth: boolean }[] = [];

        for (let index = start.day() - 1; index >= 0; index--) {
            days.push({ date: start.subtract(index + 1, 'day'), isCurrentMonth: false });
        }

        for (let day = 0; day < end.date(); day++) {
            days.push({ date: start.add(day, 'day'), isCurrentMonth: true });
        }

        while (days.length % 7 !== 0) {
            days.push({ date: days[days.length - 1].date.add(1, 'day'), isCurrentMonth: false });
        }

        return days;
    };

    const handleDayClick = (date: dayjs.Dayjs) => {
        setCurrent(date.startOf('month'));
        setSelectedDate(date);
        setFormMode('list');
        setIsCalendarOpen(false);
    };

    const changeCalendarMonth = (nextMonth: dayjs.Dayjs) => {
        setCurrent(nextMonth.startOf('month'));
    };

    const handleAddClick = () => {
        setSelectedAgenda(null);
        setSelectedItens([{ itemId: '', quantidade: 1 }]);
        setClienteId('');
        setEnderecoId('');
        setObservacao('');
        setDesconto(0);
        setFrete(0);
        const initialDate = selectedDate ?? today;
        setDataStr(initialDate.hour(8).minute(0).format('YYYY-MM-DDTHH:mm'));
        setDataColetaStr(initialDate.hour(18).minute(0).format('YYYY-MM-DDTHH:mm'));
        setFormMode('new');
    };

    const handleEditClick = (row: AgendaItem) => {
        setSelectedAgenda(row);
        setSelectedItens(row.itens.map(i => ({ itemId: i.itemId, quantidade: i.quantidade })));
        setClienteId(String(row.cliente.id));
        setEnderecoId(String(row.endereco.id));
        setObservacao(row.observacao || '');
        setDesconto(row.desconto ?? 0);
        setFrete(row.frete ?? 0);
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
            frete,
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
            frete,
            valorTotal: valorTotalCalculado,
        };

        if (selectedAgenda?.id) {
            updateMutation.mutate({ id: selectedAgenda.id, data: payload });
        } else {
            saveMutation.mutate(payload);
        }
    };

    const days = buildCalendarDays();
    const yearOptions = Array.from({ length: 11 }, (_, index) => today.year() - 5 + index);
    const filteredAgendas = selectedDate
        ? agendas.filter((agenda) => dayjs(agenda.data).isSame(selectedDate, 'day'))
        : agendas;

    return (
        <div className="page-inner">
            <div className="page-header">
                <h2>📅 Agenda</h2>
                <p>Acompanhe e gerencie as locações do mês</p>
            </div>

            <div className="agenda-layout">
                {formMode === 'list' && (
                    <section className="agenda-form-card agenda-list-card">
                        <div className="agenda-list-heading">
                            <div>
                                <h3>Locações</h3>
                                <p>
                                    {selectedDate
                                        ? `Exibindo locações de ${selectedDate.format('DD/MM/YYYY')}`
                                        : `${MONTHS[current.month()]} de ${current.year()}`}
                                </p>
                            </div>
                            <div className="agenda-filter-actions">
                                {selectedDate && (
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setSelectedDate(null)}
                                    >
                                        Limpar filtro
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={`btn ${selectedDate ? 'btn-primary' : 'btn-ghost'} btn-icon`}
                                    onClick={() => setIsCalendarOpen(true)}
                                    aria-label="Filtrar locações por data"
                                    title="Filtrar por data"
                                >
                                    <FilterAltIcon fontSize="small" />
                                </button>
                            </div>
                        </div>
                        <DataGrid
                            columns={agendaColumns}
                            data={filteredAgendas}
                            onAdd={handleAddClick}
                            onRowClick={handleEditClick}
                            emptyText={selectedDate
                                ? 'Nenhuma locação encontrada para esta data.'
                                : 'Nenhuma locação encontrada neste mês.'}
                        />
                    </section>
                )}

                <Modal
                    title="Filtrar locações por data"
                    open={isCalendarOpen}
                    onClose={() => setIsCalendarOpen(false)}
                    size="sm"
                    footer={(
                        <>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => {
                                    setSelectedDate(null);
                                    setIsCalendarOpen(false);
                                }}
                            >
                                Limpar filtro
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => handleDayClick(today)}
                            >
                                Hoje
                            </button>
                        </>
                    )}
                >
                    <div className="calendar-card agenda-filter-calendar">
                        <div className="calendar-header">
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm btn-icon"
                                onClick={() => changeCalendarMonth(current.subtract(1, 'month'))}
                                aria-label="Mês anterior"
                            >
                                ‹
                            </button>
                            <div className="agenda-calendar-period">
                                <select
                                    className="form-control"
                                    aria-label="Mês da agenda"
                                    value={current.month()}
                                    onChange={(event) => changeCalendarMonth(current.month(Number(event.target.value)))}
                                >
                                    {MONTHS.map((month, index) => <option key={month} value={index}>{month}</option>)}
                                </select>
                                <select
                                    className="form-control"
                                    aria-label="Ano da agenda"
                                    value={current.year()}
                                    onChange={(event) => changeCalendarMonth(current.year(Number(event.target.value)))}
                                >
                                    {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                                </select>
                            </div>
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm btn-icon"
                                onClick={() => changeCalendarMonth(current.add(1, 'month'))}
                                aria-label="Próximo mês"
                            >
                                ›
                            </button>
                        </div>
                        <div className="calendar-grid">
                            <div className="calendar-weekdays">
                                {DAYS.map((day) => <div key={day} className="calendar-weekday">{day}</div>)}
                            </div>
                            <div className="calendar-days">
                                {days.map(({ date, isCurrentMonth }, index) => {
                                    const key = date.format('YYYY-MM-DD');
                                    const isToday = date.isSame(today, 'day');
                                    const isSelected = selectedDate?.isSame(date, 'day');
                                    const hasEvent = eventDates.has(key);
                                    let className = 'calendar-day';
                                    if (!isCurrentMonth) className += ' other-month';
                                    if (isToday) className += ' today';
                                    if (isSelected) className += ' selected';
                                    if (hasEvent) className += ' has-event';

                                    return (
                                        <button
                                            type="button"
                                            key={index}
                                            className={className}
                                            onClick={() => handleDayClick(date)}
                                            aria-label={`Filtrar por ${date.format('DD/MM/YYYY')}`}
                                        >
                                            {date.date()}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* Form */}
                {(formMode === 'new' || formMode === 'edit') && (
                    <div className="agenda-form-card mobile-modal">
                        <div className="agenda-form-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                {formMode === 'new' ? '➕ Novo Agendamento' : '✏️ Editar Agendamento'}
                                {' — '}
                                <span style={{ color: 'var(--accent-hover)', fontWeight: 400 }}>
                                    {dataStr ? dayjs(dataStr).format('DD/MM/YYYY') : 'Data não definida'}
                                </span>
                            </div>
                            <button 
                                onClick={() => setFormMode('list')}
                                style={{ 
                                    background: 'var(--danger-light)', 
                                    color: 'var(--danger)', 
                                    border: 'none', 
                                    borderRadius: '50%', 
                                    width: 32, 
                                    height: 32, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    fontSize: 18,
                                    cursor: 'pointer' 
                                }}
                            >
                                ×
                            </button>
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
                            frete={frete}
                            setFrete={setFrete}
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
