import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface EstoqueItem {
    id: string;
    nome: string;
    peso: number;
    largura: number;
    altura: number;
    valorDiaria: number;
    quantidade: number;
    disponivel: number;
    ativo: boolean;
    imageUrl?: string | null;
    imageUrls?: string[];
}

interface Atendente {
    id: string;
    nome: string;
    whatsapp?: string | null;
}

// ─── WhatsApp link helper ─────────────────────────────────────────────────────
function makeWhatsAppLink(phone: string, itemName: string) {
    const digits = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá! Tenho interesse no item "${itemName}" do catálogo. Poderia me passar mais informações?`);
    return `https://wa.me/55${digits}?text=${msg}`;
}

// ─── Item Detail Modal ────────────────────────────────────────────────────────
function ItemModal({ item, atendentes, onClose }: { item: EstoqueItem; atendentes: Atendente[]; onClose: () => void }) {
    const isUnavailable = item.disponivel <= 0;
    const withPhone = atendentes.filter((a) => a.whatsapp);
    const images = [item.imageUrl, ...(item.imageUrls || [])].filter((url): url is string => Boolean(url));
    const [activeImage, setActiveImage] = useState(images[0] || '');

    return (
        <div className="catalog-modal-overlay" onClick={onClose}>
            <div className="catalog-modal" onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <button className="catalog-modal-close" onClick={onClose} aria-label="Fechar">
                    ✕
                </button>

                {/* Icon banner */}
                <div className="catalog-modal-banner">
                    {activeImage ? (
                        <img src={activeImage} alt={item.nome} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
                    ) : (
                        <div className="catalog-modal-icon">🏗</div>
                    )}
                    <div className={`catalog-modal-badge ${isUnavailable ? 'unavailable' : 'available'}`}>
                        {isUnavailable ? '● Indisponível' : '● Disponível'}
                    </div>
                </div>

                {/* Content */}
                <div className="catalog-modal-body">
                    <h2 className="catalog-modal-title">{item.nome}</h2>

                    {images.length > 1 && (
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 18 }}>
                            {images.map((image, index) => (
                                <button
                                    key={`${image}-${index}`}
                                    type="button"
                                    onClick={() => setActiveImage(image)}
                                    style={{ padding: 0, border: activeImage === image ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer', flexShrink: 0 }}
                                >
                                    <img src={image} alt={`Imagem ${index + 1} de ${item.nome}`} style={{ width: 64, height: 48, objectFit: 'cover', display: 'block', borderRadius: 4 }} />
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="catalog-modal-specs">
                        <div className="spec-card">
                            <span className="spec-icon">⚖️</span>
                            <span className="spec-label">Peso</span>
                            <span className="spec-value">{item.peso} kg</span>
                        </div>
                        <div className="spec-card">
                            <span className="spec-icon">📐</span>
                            <span className="spec-label">Largura</span>
                            <span className="spec-value">{item.largura} m</span>
                        </div>
                        <div className="spec-card">
                            <span className="spec-icon">📏</span>
                            <span className="spec-label">Altura</span>
                            <span className="spec-value">{item.altura} m</span>
                        </div>
                        <div className="spec-card">
                            <span className="spec-icon">📦</span>
                            <span className="spec-label">Estoque</span>
                            <span className="spec-value">{item.quantidade} un</span>
                        </div>
                    </div>

                    <div className="catalog-modal-availability">
                        <span className="availability-label">Disponíveis agora</span>
                        <div className="availability-bar-wrap">
                            <div
                                className="availability-bar-fill"
                                style={{
                                    width: `${Math.min(100, (item.disponivel / Math.max(item.quantidade, 1)) * 100)}%`,
                                    background: isUnavailable
                                        ? 'var(--danger)'
                                        : 'linear-gradient(90deg, var(--success), #4ade80)',
                                }}
                            />
                        </div>
                        <span className="availability-count">
                            {item.disponivel} de {item.quantidade}
                        </span>
                    </div>

                    <div className="catalog-modal-price-row">
                        <div style={{ margin: "auto" }}>
                            <span className="price-label">Valor da diária</span>
                            <span className="price-value">
                                R$ {Number(item.valorDiaria).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Catalog Card ─────────────────────────────────────────────────────────────
function CatalogCard({ item, onClick, animationDelay = 0 }: { item: EstoqueItem; onClick: () => void; animationDelay?: number }) {
    const isUnavailable = item.disponivel <= 0;

    return (
        <div
            className={`catalog-card ${isUnavailable ? 'catalog-card--unavailable' : ''}`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
            style={{ animationDelay: `${animationDelay}ms` }}
        >
            <div className="catalog-card-shine" />

            <div className="catalog-card-header">
                <div className="catalog-card-icon-wrap" style={item.imageUrl ? { overflow: 'hidden' } : undefined}>
                    {item.imageUrl
                        ? <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span className="catalog-card-icon">🏗</span>}
                </div>
                <span className={`catalog-card-status ${isUnavailable ? 'status-unavail' : 'status-avail'}`}>
                    {isUnavailable ? 'Esgotado' : `${item.disponivel} disp.`}
                </span>
            </div>

            <h3 className="catalog-card-name">{item.nome}</h3>

            <div className="catalog-card-details">
                <div className="detail-row">
                    <span className="detail-label">Dimensões</span>
                    <span className="detail-val">{item.largura}m × {item.altura}m</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Peso</span>
                    <span className="detail-val">{item.peso} kg</span>
                </div>
            </div>

            <div className="catalog-card-footer">
                <div className="catalog-card-price">
                    <span className="price-per">/ dia</span>
                    <span className="price-num">
                        R$ {Number(item.valorDiaria).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                </div>
                <span className="catalog-card-cta">Ver detalhes →</span>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function CatalogPage() {
    const { data: estoqueRes, isLoading } = trpc.estoque.list.useQuery({
        filtros: { ativo: true },
        limit: 200,
    });

    const { data: atendentesRes } = trpc.usuarios.listAtendentes.useQuery();

    const atendentes: Atendente[] = atendentesRes || [];

    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'available' | 'unavailable'>('all');
    const [selectedItem, setSelectedItem] = useState<EstoqueItem | null>(null);

    const allItems: EstoqueItem[] = estoqueRes?.data || [];

    const items = allItems.filter((item) => {
        const matchSearch = item.nome.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            filter === 'all' ||
            (filter === 'available' && item.disponivel > 0) ||
            (filter === 'unavailable' && item.disponivel <= 0);
        return matchSearch && matchFilter;
    });

    return (
        <div className="catalog-page">
            {/* ── Hero ── */}
            <header className="catalog-hero">
                <div className="catalog-hero-bg" />
                <div className="catalog-hero-content">
                    <div className="catalog-hero-tag">📦 Catálogo online</div>
                    <h1 className="catalog-hero-title">
                        Equipamentos para <br />
                        <span className="catalog-hero-accent">sua locação</span>
                    </h1>
                    <p className="catalog-hero-subtitle">
                        Confira nossos itens disponíveis, preços e especificações técnicas.
                        <br />Clique em um item para ver todos os detalhes.
                    </p>

                    {/* Search bar */}
                    <div className="catalog-search-wrap">
                        <span className="catalog-search-icon">🔍</span>
                        <input
                            className="catalog-search-input"
                            type="text"
                            placeholder="Buscar equipamento..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {/* ── Filters + Stats ── */}
            <div className="catalog-toolbar">
                <div className="catalog-filters">
                    {(['all', 'available', 'unavailable'] as const).map((f) => (
                        <button
                            key={f}
                            className={`catalog-filter-btn ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? 'Todos' : f === 'available' ? '✅ Disponíveis' : '❌ Esgotados'}
                        </button>
                    ))}
                </div>
                <span className="catalog-count">
                    {items.length} {items.length === 1 ? 'item' : 'itens'}
                </span>
            </div>

            {/* ── Grid ── */}
            <main className="catalog-main">
                {isLoading ? (
                    <div className="catalog-loading">
                        <div className="catalog-spinner" />
                        <span>Carregando catálogo...</span>
                    </div>
                ) : items.length === 0 ? (
                    <div className="catalog-empty">
                        <div className="catalog-empty-icon">📭</div>
                        <p>Nenhum item encontrado.</p>
                        {search && (
                            <button className="catalog-clear-btn" onClick={() => setSearch('')}>
                                Limpar busca
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="catalog-grid">
                        {items.map((item, idx) => (
                            <CatalogCard
                                key={item.id}
                                item={item}
                                onClick={() => setSelectedItem(item)}
                                animationDelay={Math.min(idx, 10) * 60}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* ── Footer ── */}
            <footer className="catalog-footer">
                {atendentes.length > 0 ? (
                    <div className="catalog-footer-contacts">
                        <p>Fale com um de nossos atendentes:</p>
                        <div className="catalog-footer-links">
                            {atendentes.map((a) => (
                                <a
                                    key={a.id}
                                    href={makeWhatsAppLink(a.whatsapp!, 'equipamento')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="catalog-whatsapp-btn"
                                >
                                    <span>📱</span>
                                    <span>{a.nome}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p>Entre em contato para mais informações sobre preços e disponibilidade.</p>
                )}
            </footer>

            {/* ── Modal ── */}
            {selectedItem && (
                <ItemModal
                    item={selectedItem}
                    atendentes={atendentes}
                    onClose={() => setSelectedItem(null)}
                />
            )}
        </div>
    );
}
