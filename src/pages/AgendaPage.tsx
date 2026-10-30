import { useGridColumns } from '@/hooks/useGridColumns';
import { useGridPagination } from '@/hooks/useGridPagination';
import { useState, useMemo } from 'react';
import '@/styles/AgendaPage.css';
import { trpc } from '@/lib/trpc';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ClearIcon from '@mui/icons-material/Clear';
import Switch from '@mui/material/Switch';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { toast } from 'react-toastify';
import { DataGrid, Column } from '@/components/ui/DataGrid';
import { AgendaFilters, type AgendaFilterOption } from '@/components/forms/AgendaFilters';
import { AgendaForm } from '@/components/forms/AgendaForm';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Modal } from '@/components/ui/Modal';
import { agendaSchema } from '@/lib/schemas';
import { mergeAgendaOptions } from '@/lib/agendaOptions';
import type { RemoteOption } from '@/lib/remoteOptions';

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
    entregue: boolean;
    concluida: boolean;
    status: { cor: 'success' | 'danger' | 'warning' | 'pending'; texto: string };
    itens: { id: string; itemId: string; quantidade: number; estoques: { nome: string; valorDiaria?: number; disponivel: number } }[];
    cliente: { id: string; nome: string };
    endereco: { id: string; rua: string; numero: string; bairro?: string | null; cep: string; complemento?: string | null };
}

interface SelectItem { id: string; nome: string; disponivel?: number; valorDiaria?: number; }
interface SelectEndereco { id: string; rua: string; numero: string; bairro?: string | null; cep: string; clienteId: string; }

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function getAgendaColumns(onStatusChange: (agenda: AgendaItem, field: 'entregue' | 'concluida', checked: boolean) => void, saving: boolean, timeZone: string): Column<AgendaItem>[] {
    const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    return [
    {
        key: 'itens',
        label: 'Itens Locados', sortable: false, mobileLayout: 'stacked',
        render: (_, row) => row.itens?.map(i => `${i.quantidade}x ${i.estoques?.nome}`).join(', ') || '—'
    },
    { key: 'cliente', label: 'Cliente', render: (_, row) => row.cliente?.nome },
    {
        key: 'endereco', label: 'Endereço de entrega', mobileLayout: 'stacked',
        render: (_, row) => <span className="agenda-delivery-address">
            <span>{[row.endereco.rua, row.endereco.numero, row.endereco.complemento].filter(Boolean).join(', ')}</span>
            <small>{[row.endereco.bairro, row.endereco.cep && `CEP ${row.endereco.cep}`].filter(Boolean).join(' • ')}</small>
        </span>,
    },
    { key: 'data', label: 'Entrega', mobileLayout: 'half', filterType: 'date', render: (_, row) => dateFormat.format(new Date(row.data)) },
    { key: 'dataColeta', label: 'Coleta', mobileLayout: 'half', filterType: 'date', render: (_, row) => dateFormat.format(new Date(row.dataColeta)) },
    {
        key: 'valorTotal',
        label: 'Total', filterType: 'number',
        render: (_, row) => {
            const val = row.valorTotal ?? 0;
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
        }
    },
    { key: 'observacao', label: 'Observações', mobileLayout: 'stacked', render: (_, row) => row.observacao || '—' },
    {
        key: 'status', label: 'Situação', sortable: false, filterType: 'select',
        filterOptions: [
            { value: 'danger', label: 'Em atraso' }, { value: 'warning', label: 'Em até 1 hora' },
            { value: 'success', label: 'Entregue e coletada' }, { value: 'pending', label: 'Pendente sem alerta' },
        ],
        render: (_, row) => <span className={`agenda-status agenda-status--${row.status.cor}`}>{row.status.texto}</span>,
    },
    ...(['entregue', 'concluida'] as const).map((field) => ({
        key: field, filterType: 'boolean' as const, mobileLayout: 'half' as const,
        label: field === 'entregue' ? 'Entregue' : 'Coletada',
        width: '100px',
        render: (_: unknown, row: AgendaItem) => (
            <span className="agenda-confirmation" onClick={(event) => event.stopPropagation()}>
                <Switch
                    checked={row[field]}
                    disabled={saving}
                    slotProps={{ input: { 'aria-label': `${field === 'entregue' ? 'Entrega' : 'Coleta'} confirmada — ${row.cliente.nome}` } }}
                    onChange={(_, checked) => onStatusChange(row, field, checked)}
                />
            </span>
        ),
    })),
];
}

export function AgendaPage() {
    const today = dayjs();
    const [current, setCurrent] = useState(today);
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
    const [selectedAgenda, setSelectedAgenda] = useState<AgendaItem | null>(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const { page, setPage, pageSize, onPageSizeChange } = useGridPagination();
    const [clienteFilter, setClienteFilter] = useState<AgendaFilterOption | null>(null);
    const [itemFilter, setItemFilter] = useState<AgendaFilterOption | null>(null);
    const [concluidaFilter, setConcluidaFilter] = useState(false);

    const gridColumns = useGridColumns([], setPage);
    const utils = trpc.useUtils();

    // Form state
    const [knownItems, setKnownItems] = useState<RemoteOption[]>([]);
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
    const filters = {
        concluida: concluidaFilter,
        clienteId: clienteFilter?.id,
        itemId: itemFilter?.id,
        colunas: gridColumns.appliedFilters,
    };
    const { data: agendasRes, isLoading: isLoadingAgendas, isError: agendasError, refetch: refetchAgendas } = trpc.agendas.search.useQuery({
        ...filters,
        pagina: page,
        limit: pageSize,
        sort: gridColumns.props.sort ?? undefined,
        inicio: selectedDate?.startOf('day').toISOString(),
        fim: selectedDate?.endOf('day').toISOString(),
    }, { refetchInterval: 30_000 });

    const { data: pendingDeliveryDates } = trpc.agendas.pendingDeliveryDates.useQuery({
        ...filters,
        inicio: current.startOf('month').startOf('week').toISOString(),
        fim: current.endOf('month').endOf('week').toISOString(),
    }, { enabled: isCalendarOpen });


    const agendas = useMemo(() => {
        return (agendasRes?.data || []).map((a) => ({
            id: a.id,
            data: a.data,
            dataColeta: a.dataColeta,
            observacao: a.observacao || '',
            desconto: a.desconto ?? 0,
            frete: a.frete ?? 0,
            valorTotal: a.valorTotal ?? 0,
            entregue: a.entregue,
            concluida: a.concluida,
            status: a.status,
            itens: a.itens || [],
            cliente: { id: a.clientes?.id, nome: a.clientes?.nome },
            endereco: {
                id: a.enderecos?.id,
                rua: a.enderecos?.rua,
                numero: a.enderecos?.numero,
                bairro: a.enderecos?.bairro,
                cep: a.enderecos?.cep,
                complemento: a.enderecos?.complemento,
            }
        })) as AgendaItem[];
    }, [agendasRes]);

    // O registro em edição não depende de aparecer na primeira página dos combos.
    const itens = useMemo(() => {
        const options = mergeAgendaOptions<SelectItem>(knownItems, selectedAgenda?.itens.map((item) => ({
            id: item.itemId, ...item.estoques,
        })) ?? []);
        return options.map((item) => ({
            ...item,
            // A própria reserva também pode ser mantida ou redistribuída na edição.
            disponivel: (item.disponivel ?? 0) + (selectedAgenda && !selectedAgenda.concluida
                ? selectedAgenda.itens.reduce((sum, reserved) => sum + (reserved.itemId === item.id ? reserved.quantidade : 0), 0)
                : 0),
        }));
    }, [knownItems, selectedAgenda]);
    const clientes = useMemo(() => mergeAgendaOptions<SelectItem>(
        [], selectedAgenda ? [selectedAgenda.cliente] : [],
    ), [selectedAgenda]);
    const enderecos = useMemo(() => mergeAgendaOptions<SelectEndereco>(
        [], selectedAgenda ? [{ ...selectedAgenda.endereco, clienteId: selectedAgenda.cliente.id }] : [],
    ), [selectedAgenda]);

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
            setPage(1);
            toast.success('Agendamento salvo com sucesso!', { theme: 'colored' });
            utils.agendas.list.invalidate(); void utils.seletores.invalidate();
            utils.agendas.search.invalidate();
            utils.transacoes.analytics.invalidate();
            utils.agendas.pendingDeliveryDates.invalidate();
            utils.estoque.list.invalidate();
            setFormMode('list');
        },
        onError: (err) => toast.error(`Erro: ${err.message}`, { theme: 'colored' }),
    });

    const updateMutation = trpc.agendas.update.useMutation({
        onSuccess: () => {
            setPage(1);
            toast.success('Agendamento salvo com sucesso!', { theme: 'colored' });
            utils.agendas.list.invalidate(); void utils.seletores.invalidate();
            utils.agendas.search.invalidate();
            utils.transacoes.analytics.invalidate();
            utils.agendas.pendingDeliveryDates.invalidate();
            utils.estoque.list.invalidate();
            setFormMode('list');
        },
        onError: (err) => toast.error(`Erro: ${err.message}`, { theme: 'colored' }),
    });

    const completionMutation = trpc.agendas.update.useMutation({
        onSuccess: () => {
            setPage(1);
            toast.success('Status da locação atualizado!', { theme: 'colored' });
            utils.agendas.list.invalidate(); void utils.seletores.invalidate();
            utils.agendas.search.invalidate();
            utils.transacoes.analytics.invalidate();
            utils.agendas.pendingDeliveryDates.invalidate();
            utils.estoque.list.invalidate();
        },
        onError: (err) => toast.error(`Erro: ${err.message}`, { theme: 'colored' }),
    });

    const deleteMutation = trpc.agendas.delete.useMutation({
        onSuccess: () => {
            setPage(1);
            setSelectedAgenda(null);
            setFormMode('list');
            utils.agendas.list.invalidate(); void utils.seletores.invalidate();
            utils.agendas.search.invalidate();
            utils.transacoes.analytics.invalidate();
            utils.agendas.pendingDeliveryDates.invalidate();
            utils.estoque.list.invalidate();
        },
        onError: (err) => toast.error(`Erro: ${err.message}`, { theme: 'colored' }),
    });

    const agendaColumns = useMemo(
        () => getAgendaColumns(
            (agenda, field, checked) => completionMutation.mutate({ id: agenda.id, data: { [field]: checked } }),
            completionMutation.isPending,
            agendasRes?.timeZone ?? 'UTC',
        ),
        [completionMutation, agendasRes?.timeZone],
    );

    // Filtra endereços pelo cliente selecionado
    const filteredEnderecos = useMemo(() => {
        if (!clienteId) return [];
        return enderecos.filter((e) => e.clienteId === clienteId);
    }, [clienteId, enderecos]);

    const eventDates = new Set((pendingDeliveryDates ?? []).map((agenda) => dayjs(agenda.data).format('YYYY-MM-DD')));

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
        setPage(1);
        setFormMode('list');
        setIsCalendarOpen(false);
    };

    const changeCalendarMonth = (nextMonth: dayjs.Dayjs) => {
        setCurrent(nextMonth.startOf('month'));
    };

    const handleAddClick = () => {
        setKnownItems([]);
        setFormErrors({});
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
        setKnownItems([]);
        setFormErrors({});
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

    return (
        <div className="grid-page agenda-page">
            <div className="agenda-layout">
                <section className="grid-page" aria-label="Locações">
                    {agendasError && <div role="alert">
                        Não foi possível carregar as locações.
                        <button className="btn btn-ghost" onClick={() => void refetchAgendas()}>Tentar novamente</button>
                    </div>}
                    <DataGrid
                        {...gridColumns.props}
                        activeFilterCount={Number(!!clienteFilter) + Number(!!itemFilter) + Number(concluidaFilter)}
                        filters={<AgendaFilters
                            cliente={clienteFilter}
                            item={itemFilter}
                            concluida={concluidaFilter}
                            onClienteChange={(value) => { setClienteFilter(value); setPage(1); }}
                            onItemChange={(value) => { setItemFilter(value); setPage(1); }}
                            onConcluidaChange={(value) => { setConcluidaFilter(value); setPage(1); }}
                        />}
                        toolbarActions={<>
                            {selectedDate && <button
                                type="button"
                                className="btn btn-ghost btn-sm agenda-clear-date"
                                aria-label="Limpar filtro de data" title="Limpar filtro de data"
                                onClick={() => { setSelectedDate(null); setPage(1); }}
                            >
                                <ClearIcon fontSize="small" /><span>Limpar data</span>
                            </button>}
                            <button
                                type="button"
                                className={`btn btn-primary ${selectedDate ? '' : 'btn-icon'}`}
                                onClick={() => setIsCalendarOpen(true)}
                                aria-label={selectedDate ? `Filtrar locações por data: ${selectedDate.format('DD/MM/YYYY')}` : 'Filtrar locações por data'}
                                title="Filtrar por data"
                            >
                                <FilterAltIcon fontSize="small" />
                                {selectedDate && <span>{selectedDate.format('DD/MM/YYYY')}</span>}
                            </button>
                        </>}
                        columns={agendaColumns}
                        data={agendas}
                        rowClassName={(row) => `agenda-row--${row.status.cor}`}
                        loading={isLoadingAgendas}
                        total={agendasRes?.total ?? 0}
                        page={page}
                        pageSize={pageSize}
                        onPageSizeChange={onPageSizeChange}
                        onPageChange={setPage}
                        onRefresh={() => { void refetchAgendas(); void utils.agendas.pendingDeliveryDates.invalidate(); }}
                        onAdd={handleAddClick}
                        onRowClick={handleEditClick}
                        emptyText="Nenhuma locação encontrada para os filtros selecionados."
                    />
                </section>

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
                                    setPage(1);
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

                <Modal
                    title={`${formMode === 'new' ? 'Novo Agendamento' : 'Editar Agendamento'} — ${dataStr ? dayjs(dataStr).format('DD/MM/YYYY') : 'Data não definida'}`}
                    open={formMode !== 'list'}
                    onClose={() => { if (!confirmModal.isOpen) setFormMode('list'); }}
                    size="lg"
                    footer={<>
                        {formMode === 'edit' && selectedAgenda && (
                            <button
                                type="button"
                                className="btn btn-danger"
                                disabled={deleteMutation.isPending}
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
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setFormMode('list')}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={saveMutation.isPending || updateMutation.isPending}
                        >
                            {saveMutation.isPending || updateMutation.isPending ? 'Salvando...' : '💾 Salvar'}
                        </button>
                    </>}
                >
                    <AgendaForm
                        onItemOption={(option) => setKnownItems((current) => mergeAgendaOptions([option], current))}
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
                </Modal>

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
