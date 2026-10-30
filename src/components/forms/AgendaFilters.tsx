import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { RemoteAutocomplete } from '@/components/ui/RemoteAutocomplete';

export interface AgendaFilterOption { id: string; nome: string; }

export function AgendaFilters({ cliente, item, concluida, onClienteChange, onItemChange, onConcluidaChange }: {
    cliente: AgendaFilterOption | null;
    item: AgendaFilterOption | null;
    concluida: boolean;
    onClienteChange: (option: AgendaFilterOption | null) => void;
    onItemChange: (option: AgendaFilterOption | null) => void;
    onConcluidaChange: (value: boolean) => void;
}) {
    return <div className="agenda-search-filters">
        <RemoteAutocomplete className="agenda-filter-combo" tipo="clientes" label="Cliente" size="small" valueId={cliente?.id ?? ''} initialOptions={cliente ? [cliente] : []} onChange={onClienteChange} />
        <RemoteAutocomplete className="agenda-filter-combo" tipo="itens" label="Item" size="small" valueId={item?.id ?? ''} initialOptions={item ? [item] : []} onChange={onItemChange} />
        <FormControlLabel
            control={<Switch checked={concluida} onChange={(_, checked) => onConcluidaChange(checked)} />}
            label={concluida ? 'Concluídas' : 'Pendentes'}
        />
    </div>;
}
