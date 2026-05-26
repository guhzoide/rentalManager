export type ElementType = 'text' | 'grid' | 'separator' | 'fieldGroup';
export type DbTableName = 'estoque' | 'clientes' | 'agendas' | 'transacoes' | 'empresas';
export type DbData = Record<DbTableName, any[]>;

export interface BaseElement {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface TextElement extends BaseElement {
    type: 'text';
    content: string;
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    align: 'left' | 'center' | 'right';
    color: string;
    dbTable?: string;
    dbRecordId?: string;
    dbColumn?: string;
}

export interface GridElement extends BaseElement {
    type: 'grid';
    rows: number;
    cols: number;
    headers: string[];
    cells: string[][];
    dbTable?: string;
    headerBgColor?: string;
    columnMappings?: Record<string, string>;
    selectedColumns?: string[];
    selectedRecordIds?: string[];
}

export interface SeparatorElement extends BaseElement {
    type: 'separator';
    color: string;
    thickness?: number;
}

export interface FieldGroupField {
    id: string;
    label: string;
    staticValue?: string;
    dbColumn?: string;
    isCurrency?: boolean;
    sumColumn?: string;
}

export interface FieldGroupElement extends BaseElement {
    type: 'fieldGroup';
    title?: string;
    titleBgColor?: string;
    borderColor?: string;
    fontSize: number;
    labelBold: boolean;
    columns: 1 | 2;
    fields: FieldGroupField[];
    dbTable?: string;
    dbRecordId?: string;
}

export type KanvasElement = TextElement | GridElement | SeparatorElement | FieldGroupElement;

export interface KanvasDoc {
    id: string;
    name: string;
    pageWidth: number;
    pageHeight: number;
    type?: 'nf' | 'recibo' | 'os' | 'blank';
    elements: KanvasElement[];
}


export const DB_TABLES: DbTableName[] = ['estoque', 'clientes', 'agendas', 'transacoes', 'empresas'];

export function newId() {
    return Math.random().toString(36).slice(2, 10);
}

export function getColumnsFromRecords(records: any[]): string[] {
    const set = new Set<string>();
    for (const r of records) {
        if (r && typeof r === 'object') {
            for (const k of Object.keys(r)) {
                const v = (r as any)[k];
                if (v === null || v === undefined) { set.add(k); continue; }
                const t = typeof v;
                if (t === 'string' || t === 'number' || t === 'boolean' || v instanceof Date) {
                    set.add(k);
                }
            }
        }
    }
    return Array.from(set);
}


export function emptyDocument(name = 'Novo documento'): KanvasDoc {
    return {
        id: newId(),
        name,
        pageWidth: 794, // A4 a 96dpi
        pageHeight: 1123,
        elements: [],
    };
}

export function templateNotaFiscal(): KanvasDoc {
    const doc = emptyDocument('Nota Fiscal');
    doc.type = 'nf';
    doc.elements = [
        {
            id: newId(), type: 'text', x: 40, y: 30, width: 714, height: 40,
            content: 'NOTA FISCAL DE SERVIÇO DE LOCAÇÃO (NFS-e)', fontSize: 20, fontWeight: 'bold',
            align: 'center', color: '#0f172a',
        },
        {
            id: newId(), type: 'separator', x: 40, y: 76, width: 714, height: 2,
            color: '#0f172a',
        },
        {
            id: newId(), type: 'fieldGroup', x: 40, y: 90, width: 714, height: 110,
            title: 'PRESTADOR DE SERVIÇO (EMITENTE)', titleBgColor: '#0f172a', borderColor: '#cbd5e1',
            fontSize: 12, labelBold: true, columns: 2,
            dbTable: 'empresas',
            fields: [
                { id: newId(), label: 'Razão Social', dbColumn: 'nome' },
                { id: newId(), label: 'CNPJ', dbColumn: 'cnpj' },
                { id: newId(), label: 'Telefone', dbColumn: 'telefone' },
                { id: newId(), label: 'Rua', dbColumn: 'logradouro' },
                { id: newId(), label: 'Número', dbColumn: 'numero' },
                { id: newId(), label: 'Bairro', dbColumn: 'bairro' },
                { id: newId(), label: 'CEP', dbColumn: 'cep' },
            ],
        },
        {
            id: newId(), type: 'fieldGroup', x: 40, y: 210, width: 714, height: 110,
            title: 'TOMADOR DO SERVIÇO (CLIENTE)', titleBgColor: '#0f172a', borderColor: '#cbd5e1',
            fontSize: 12, labelBold: true, columns: 2,
            dbTable: 'clientes',
            fields: [
                { id: newId(), label: 'Nome', dbColumn: 'nome' },
                { id: newId(), label: 'CPF/CNPJ', dbColumn: 'cpf' },
                { id: newId(), label: 'Contato', dbColumn: 'contato' },
                { id: newId(), label: 'Rua', dbColumn: 'rua' },
                { id: newId(), label: 'Número', dbColumn: 'numero' },
                { id: newId(), label: 'CEP', dbColumn: 'cep' },
            ],
        },
        {
            id: newId(), type: 'grid', x: 40, y: 340, width: 714, height: 300,
            rows: 5, cols: 4,
            headers: ['Descrição', 'Qtd', 'Valor unit.', 'Total'],
            cells: Array.from({ length: 4 }, () => ['', '', '', '']),
            dbTable: 'agendas',
            headerBgColor: '#0f172a',
        },
        {
            id: newId(), type: 'separator', x: 40, y: 650, width: 714, height: 1,
            color: '#cbd5e1',
        },
        {
            id: newId(), type: 'text', x: 40, y: 665, width: 714, height: 40,
            content: 'OBSERVAÇÕES: Documento emitido para fins de controle de locação de bens e prestação de serviços. O valor total listado acima representa o montante consolidado do contrato de aluguel por período.', fontSize: 10, fontWeight: 'normal',
            align: 'left', color: '#64748b',
        },
    ];
    return doc;
}

export function templateOrdemServico(): KanvasDoc {
    const doc = emptyDocument('Ordem de Serviço');
    doc.elements = [
        {
            id: newId(), type: 'text', x: 40, y: 30, width: 714, height: 40,
            content: 'ORDEM DE SERVIÇO', fontSize: 24, fontWeight: 'bold',
            align: 'center', color: '#0f172a',
        },
        {
            id: newId(), type: 'separator', x: 40, y: 80, width: 714, height: 2,
            color: '#2563eb',
        },
        {
            id: newId(), type: 'fieldGroup', x: 40, y: 96, width: 714, height: 70,
            title: 'IDENTIFICAÇÃO', titleBgColor: '#2563eb', borderColor: '#cbd5e1',
            fontSize: 12, labelBold: true, columns: 2,
            fields: [
                { id: newId(), label: 'OS Nº', staticValue: '0001' },
                { id: newId(), label: 'Data', staticValue: new Date().toLocaleDateString('pt-BR') },
                { id: newId(), label: 'Responsável', staticValue: '' },
                { id: newId(), label: 'Status', staticValue: 'Aberto' },
            ],
        },
        {
            id: newId(), type: 'fieldGroup', x: 40, y: 176, width: 714, height: 110,
            title: 'CLIENTE', titleBgColor: '#2563eb', borderColor: '#cbd5e1',
            fontSize: 12, labelBold: true, columns: 2,
            dbTable: 'clientes',
            fields: [
                { id: newId(), label: 'Nome', dbColumn: 'nome' },
                { id: newId(), label: 'CPF/CNPJ', dbColumn: 'cpfCnpj' },
                { id: newId(), label: 'Telefone', dbColumn: 'telefone' },
                { id: newId(), label: 'E-mail', dbColumn: 'email' },
                { id: newId(), label: 'Endereço', dbColumn: 'endereco' },
            ],
        },
        {
            id: newId(), type: 'separator', x: 40, y: 300, width: 714, height: 1,
            color: '#cbd5e1',
        },
        {
            id: newId(), type: 'text', x: 40, y: 312, width: 714, height: 24,
            content: 'ITENS / SERVIÇOS', fontSize: 13, fontWeight: 'bold',
            align: 'left', color: '#0f172a',
        },
        {
            id: newId(), type: 'grid', x: 40, y: 342, width: 714, height: 200,
            rows: 5, cols: 4,
            headers: ['Item', 'Qtd', 'Valor unit.', 'Subtotal'],
            cells: Array.from({ length: 4 }, () => ['', '', '', '']),
            headerBgColor: '#2563eb',
        },
        {
            id: newId(), type: 'fieldGroup', x: 40, y: 560, width: 714, height: 80,
            title: 'VALORES', titleBgColor: '#2563eb', borderColor: '#cbd5e1',
            fontSize: 13, labelBold: true, columns: 2,
            fields: [
                { id: newId(), label: 'Subtotal', staticValue: 'R$ 0,00' },
                { id: newId(), label: 'Desconto', staticValue: 'R$ 0,00' },
                { id: newId(), label: 'Acréscimo', staticValue: 'R$ 0,00' },
                { id: newId(), label: 'TOTAL', staticValue: 'R$ 0,00' },
            ],
        },
        {
            id: newId(), type: 'separator', x: 200, y: 720, width: 394, height: 1,
            color: '#0f172a',
        },
        {
            id: newId(), type: 'text', x: 200, y: 726, width: 394, height: 24,
            content: 'Assinatura do cliente', fontSize: 12, fontWeight: 'normal',
            align: 'center', color: '#64748b',
        },
    ];
    return doc;
}

export function templateRecibo(): KanvasDoc {
    const doc = emptyDocument('Recibo');
    doc.elements = [
        {
            id: newId(), type: 'text', x: 40, y: 40, width: 714, height: 40,
            content: 'RECIBO', fontSize: 28, fontWeight: 'bold',
            align: 'center', color: '#0f172a',
        },
        {
            id: newId(), type: 'text', x: 40, y: 120, width: 714, height: 24,
            content: 'Nº: 0001                                 Valor: R$ 0,00',
            fontSize: 13, fontWeight: 'bold', align: 'left', color: '#0f172a',
        },
        {
            id: newId(), type: 'text', x: 40, y: 180, width: 714, height: 120,
            content: 'Recebi(emos) de ________________________________ a importância de R$ ________ ( ______________________________ ) referente a ____________________________________________.',
            fontSize: 13, fontWeight: 'normal', align: 'left', color: '#0f172a',
        },
        {
            id: newId(), type: 'text', x: 40, y: 340, width: 714, height: 24,
            content: 'Local e data: ______________________, ___/___/______',
            fontSize: 13, fontWeight: 'normal', align: 'left', color: '#0f172a',
        },
        {
            id: newId(), type: 'separator', x: 200, y: 420, width: 394, height: 2,
            color: '#0f172a',
        },
        {
            id: newId(), type: 'text', x: 200, y: 426, width: 394, height: 24,
            content: 'Assinatura', fontSize: 12, fontWeight: 'normal',
            align: 'center', color: '#64748b',
        },
    ];
    return doc;
}


/**
 * Converte e formata os dados com base na coluna (ex: formatação de moeda, datas, booleanos como Sim/Não).
 */
export function formatDbValue(val: any, colKey: string): string {
    if (val === undefined || val === null) return '';

    const keyLower = colKey.toLowerCase();

    // Tratamento de datas
    if (val instanceof Date || (typeof val === 'string' && !isNaN(Date.parse(val)) && (keyLower.includes('data') || keyLower.includes('created') || keyLower.includes('updated')))) {
        try {
            return new Date(val).toLocaleDateString('pt-BR');
        } catch {
            return String(val);
        }
    }

    // Tratamento de números
    if (typeof val === 'number') {
        if (keyLower.includes('valor') || keyLower.includes('total') || keyLower.includes('diaria') || keyLower.includes('desconto')) {
            return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        return val.toString();
    }

    // Tratamento de booleanos
    if (typeof val === 'boolean') {
        return val ? 'Sim' : 'Não';
    }

    return String(val);
}

/**
 * Retorna um texto representativo amigável para cada linha da tabela de banco de dados nos dropdowns/listas.
 */
export function formatRecordLabel(table: string, r: any): string {
    if (!r) return '';
    if (table === 'estoque') return r.nome || r.id;
    if (table === 'clientes') return r.nome || r.id;
    if (table === 'empresas') return r.nome || r.id;
    if (table === 'agendas') {
        const clientName = r.clientes?.nome || r.clienteId || 'Sem Nome';
        const dateStr = r.data ? new Date(r.data).toLocaleDateString('pt-BR') : '';
        return `Agendamento - ${clientName} (${dateStr})`;
    }
    if (table === 'transacoes') {
        return `${r.descricao || 'Sem descrição'} - R$ ${r.valor || 0}`;
    }
    return r.id || '';
}

/**
 * Calcula se o texto sobre uma cor de fundo deve ser preto ou branco com base no brilho YIQ.
 */
export function getContrastColor(hexColor?: string): string {
    if (!hexColor) return '#0f172a'; // Default dark text
    const hex = hexColor.replace('#', '');
    if (hex.length !== 6) return '#0f172a';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#0f172a' : '#ffffff';
}