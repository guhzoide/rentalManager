import { useEffect, useMemo, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { trpc } from '@/lib/trpc';
import type { RemoteOption } from '@/lib/remoteOptions';

interface Props {
    tipo: 'clientes' | 'itens' | 'categorias' | 'grupos' | 'enderecos' | 'agendas' | 'transacoes' | 'empresas';
    label: string;
    valueId: string;
    onChange: (option: RemoteOption | null) => void;
    initialOptions?: RemoteOption[];
    clienteId?: string;
    disabled?: boolean;
    size?: 'small' | 'medium';
    className?: string;
    error?: boolean;
    helperText?: string;
    onBlur?: () => void;
    formatOption?: (option: RemoteOption) => string;
    isOptionDisabled?: (option: RemoteOption) => boolean;
}

export function RemoteAutocomplete({ tipo, label, valueId, onChange, initialOptions = [], clienteId, disabled = false,
    size = 'medium', className, error, helperText, onBlur, formatOption, isOptionDisabled }: Props) {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [busca, setBusca] = useState('');
    const [picked, setPicked] = useState<RemoteOption | null>(null);
    useEffect(() => {
        const timer = setTimeout(() => setBusca(input.trim().slice(0, 100)), 300);
        return () => clearTimeout(timer);
    }, [input]);
    const query = trpc.seletores[tipo].useInfiniteQuery({ busca, limit: 30, clienteId }, {
        enabled: open && !disabled,
        getNextPageParam: (page) => page.nextCursor,
        staleTime: 30_000,
    });
    const rows = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data]);
    const known = rows.find((option) => option.id === valueId) ?? initialOptions.find((option) => option.id === valueId)
        ?? (picked?.id === valueId ? picked : null);
    const selectedQuery = trpc.seletores[tipo].useQuery({ ids: [valueId || '_'], clienteId, limit: 1 }, {
        enabled: !!valueId && !known && !disabled,
        staleTime: 30_000,
    });
    const selected = known ?? selectedQuery.data?.data.find((option) => option.id === valueId) ?? null;
    const options = selected && !rows.some((option) => option.id === selected.id) ? [selected, ...rows] : rows;
    const waiting = input.trim().slice(0, 100) !== busca || query.isFetching;
    return <Autocomplete
        className={className} size={size} fullWidth disabled={disabled}
        options={options} value={selected} open={open && !disabled}
        onOpen={() => setOpen(true)} onClose={() => setOpen(false)} onBlur={onBlur}
        onChange={(_, option) => { setPicked(option); setInput(''); onChange(option); }}
        onInputChange={(_, text, reason) => { if (reason === 'input' || reason === 'clear') setInput(text); }}
        filterOptions={(options) => options}
        getOptionLabel={formatOption ?? ((option) => option.nome)}
        getOptionKey={(option) => option.id}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        getOptionDisabled={isOptionDisabled}
        loading={waiting || selectedQuery.isFetching}
        loadingText="Buscando..."
        noOptionsText={query.isError ? 'Erro ao buscar. Feche e reabra para tentar novamente.' : waiting ? 'Buscando...' : 'Nenhum resultado encontrado'}
        slotProps={{ listbox: { onScroll: (event) => {
            const list = event.currentTarget;
            if (list.scrollHeight - list.scrollTop - list.clientHeight < 64 && query.hasNextPage && !query.isFetching) void query.fetchNextPage();
        } } }}
        renderInput={(params) => <TextField {...params} label={label} error={error} helperText={helperText} slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps.htmlInput, maxLength: 100 } }} />}
    />;
}
