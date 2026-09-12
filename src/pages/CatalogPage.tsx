import { base64Image, base64Gallery } from '@/lib/images';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './CatalogPage.css';
import { trpc } from '@/lib/trpc';
import { Modal } from '@/components/ui/Modal';
import { isDefaultCategory } from '@/lib/categories';

interface EstoqueItem {
    id: string;
    nome: string;
    categoriaId: string;
    categoria: Categoria;
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

interface Categoria {
    id: string;
    nome: string;
}

interface Atendente {
    id: string;
    nome: string;
    whatsapp?: string | null;
}

function Skeleton({ className = '' }: { className?: string }) {
    return <span className={`catalog-skeleton ${className}`} aria-hidden="true" />;
}

function CatalogLoadingGrid() {
    return (
        <div className="catalog-loading-grid" role="status" aria-label="Carregando produtos">
            <span className="catalog-loading-label">Carregando produtos...</span>
            {Array.from({ length: 8 }, (_, index) => (
                <div className="catalog-card catalog-card--skeleton" key={index} style={{ '--skeleton-delay': `${index * 70}ms` } as React.CSSProperties}>
                    <Skeleton className="catalog-skeleton-image" />
                    <div className="catalog-skeleton-card-body">
                        <Skeleton className="catalog-skeleton-title" />
                        <Skeleton className="catalog-skeleton-line" />
                        <Skeleton className="catalog-skeleton-line catalog-skeleton-line--short" />
                    </div>
                    <div className="catalog-skeleton-card-footer">
                        <Skeleton className="catalog-skeleton-price" />
                        <Skeleton className="catalog-skeleton-action" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── WhatsApp link helper ─────────────────────────────────────────────────────
function makeWhatsAppLink(phone: string, itemName: string) {
    const digits = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá! Tenho interesse no item "${itemName}" do catálogo. Poderia me passar mais informações?`);
    return `https://wa.me/${digits.length > 11 && digits.startsWith('55') ? digits : `55${digits}`}?text=${msg}`;
}

// ─── Item Detail Modal ────────────────────────────────────────────────────────
function ItemModal({ item, onClose }: { item: EstoqueItem; onClose: () => void }) {
    const isUnavailable = item.disponivel <= 0;
    const images = base64Gallery([item.imageUrl ?? '', ...(item.imageUrls || [])]);
    const [activeImage, setActiveImage] = useState(images[0] || '');

    const dialogRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
        return () => previous?.focus();
    }, []);

    return (
        <div className="catalog-modal-overlay" onClick={onClose}>
            <div className="catalog-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="catalog-item-title" onClick={(e) => e.stopPropagation()}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') onClose();
                    if (event.key !== 'Tab') return;
                    const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href]');
                    if (!controls?.length) return;
                    const first = controls[0];
                    const last = controls[controls.length - 1];
                    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
                }}>
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
                    <h2 id="catalog-item-title" className="catalog-modal-title">{item.nome}</h2>

                    {images.length > 1 && (
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 18 }}>
                            {images.map((image, index) => (
                                <button
                                    key={index} aria-pressed={activeImage === image}
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
                            <span className="spec-icon">📐</span>
                            <span className="spec-label">Largura</span>
                            <span className="spec-value">{item.largura} m</span>
                        </div>
                        <div className="spec-card">
                            <span className="spec-icon">📏</span>
                            <span className="spec-label">Altura</span>
                            <span className="spec-value">{item.altura} m</span>
                        </div>
                    </div>

                    {/* <div className="catalog-modal-availability">
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
                    </div> */}

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
    const cover = base64Image(item.imageUrl);
    const isUnavailable = item.disponivel <= 0;

    return (
        <div
            className={`catalog-card ${isUnavailable ? 'catalog-card--unavailable' : ''}`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
            style={{ animationDelay: `${animationDelay}ms` }}
        >
            <div className="catalog-card-shine" />

            <div className="catalog-card-header">
                <div className="catalog-card-icon-wrap" style={cover ? { overflow: 'hidden' } : undefined}>
                    {cover
                        ? <img loading="lazy" src={cover} alt={item.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span className="catalog-card-icon">🏗</span>}
                </div>
            </div>

            <h3 className="catalog-card-name">{item.nome}</h3>

            <div className="catalog-card-details">
                <div className="detail-row">
                    <span className="detail-label">Dimensões</span>
                    <span className="detail-val">{item.largura}m × {item.altura}m</span>
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
    const pageRef = useRef<HTMLDivElement>(null);
    const searchAnchorRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [sort, setSort] = useState('name');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [page, setPage] = useState(1);
    const [isOpen, setIsOpen] = useState(false);
    const [isSearchFloating, setIsSearchFloating] = useState(false);
    const [isFloatingSearchExpanded, setIsFloatingSearchExpanded] = useState(false);
    const [selectedItem, setSelectedItem] = useState<EstoqueItem | null>(null);
    useEffect(() => {
        const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(timeout);
    }, [search]);

    useEffect(() => {
        const pageElement = pageRef.current;
        const anchorElement = searchAnchorRef.current;
        if (!pageElement || !anchorElement) return;

        let animationFrame = 0;
        const updateFloatingSearch = () => {
            if (animationFrame) return;
            animationFrame = window.requestAnimationFrame(() => {
                animationFrame = 0;
                setIsSearchFloating(anchorElement.getBoundingClientRect().bottom <= 12);
            });
        };

        pageElement.addEventListener('scroll', updateFloatingSearch, { passive: true });
        window.addEventListener('scroll', updateFloatingSearch, { passive: true });
        document.addEventListener('scroll', updateFloatingSearch, { passive: true, capture: true });
        window.addEventListener('resize', updateFloatingSearch);
        updateFloatingSearch();

        return () => {
            pageElement.removeEventListener('scroll', updateFloatingSearch);
            window.removeEventListener('scroll', updateFloatingSearch);
            document.removeEventListener('scroll', updateFloatingSearch, true);
            window.removeEventListener('resize', updateFloatingSearch);
            if (animationFrame) window.cancelAnimationFrame(animationFrame);
        };
    }, []);

    useEffect(() => {
        const pageElement = pageRef.current;
        if (!pageElement || !isSearchFloating || !isFloatingSearchExpanded) return;

        const collapseSearch = () => setIsFloatingSearchExpanded(false);
        pageElement.addEventListener('scroll', collapseSearch, { passive: true });
        return () => pageElement.removeEventListener('scroll', collapseSearch);
    }, [isFloatingSearchExpanded, isSearchFloating]);

    const { data: categoriesRes, isLoading: isLoadingCategories } = trpc.categorias.list.useQuery({ pagina: 1, limit: 1000 });
    const categories = ([...(categoriesRes?.data ?? [])] as Categoria[]).sort((first, second) => {
        const firstIsUncategorized = isDefaultCategory(first);
        const secondIsUncategorized = isDefaultCategory(second);
        if (firstIsUncategorized !== secondIsUncategorized) return firstIsUncategorized ? -1 : 1;
        return first.nome.localeCompare(second.nome, 'pt-BR', { sensitivity: 'base' });
    });
    const selectedCategoryId = categoryFilter || categories[0]?.id || '';
    const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
    const showAllCategories = !selectedCategory || isDefaultCategory(selectedCategory);

    const { data: estoqueRes, isLoading, isFetching, isError, refetch } = trpc.estoque.list.useQuery({
        pagina: page,
        limit: 12,
        filtros: {
            ativo: true,
            ...(debouncedSearch ? { nome: { contains: debouncedSearch, mode: 'insensitive' } } : {}),
            ...(!showAllCategories && selectedCategoryId ? { categoriaId: selectedCategoryId } : {}),
        },
        orderBy: sort === 'price' ? { valorDiaria: 'asc', id: 'asc' } : { nome: 'asc', id: 'asc' },
    }, {
        enabled: !isLoadingCategories,
        placeholderData: (previousData) => previousData,
    });
    const { data: atendentesRes, isLoading: isLoadingAtendentes } = trpc.usuarios.listAtendentes.useQuery();
    const atendentes: Atendente[] = (atendentesRes || []).filter((person) => person.whatsapp);
    const items: EstoqueItem[] = estoqueRes?.data || [];
    const { data: empresaData, isLoading: isLoadingEmpresa, isError: isEmpresaError } = trpc.empresa.catalog.useQuery();
    const logo = base64Image(empresaData?.logoUrl);
    const isUpdatingItems = !isLoading && (isFetching || search.trim() !== debouncedSearch);
    const genericCompany = isEmpresaError || !empresaData;
    const isInitialLoading = isLoadingEmpresa || isLoadingCategories || isLoading || isLoadingAtendentes;

    return (
        <div className="catalog-page" ref={pageRef}>
            {isInitialLoading && (
                <div className="catalog-loading-overlay" role="status" aria-live="polite" aria-label="Preparando o catálogo">
                    <div className="catalog-loading-charm">
                        <div className="catalog-loading-orbit" aria-hidden="true">
                            <span className="catalog-loading-spark catalog-loading-spark--one">✦</span>
                            <span className="catalog-loading-spark catalog-loading-spark--two">✦</span>
                            <span className="catalog-loading-package">
                                <i className="catalog-loading-package-bow" />
                                <i className="catalog-loading-package-lid" />
                                <i className="catalog-loading-package-body" />
                            </span>
                        </div>
                        <strong>Preparando o catálogo</strong>
                        <span>Organizando tudo com carinho para você...</span>
                        <div className="catalog-loading-dots" aria-hidden="true"><i /><i /><i /></div>
                    </div>
                </div>
            )}
            {isSearchFloating && createPortal(
                <div className="catalog-page catalog-floating-portal">
                    <div className={`catalog-search-wrap catalog-search-wrap--floating catalog-search-wrap--${isFloatingSearchExpanded ? 'expanded' : 'collapsed'}`} role="region" aria-label="Busca e filtros do catálogo">
                    <div className="catalog-search-top">
                        <div className="catalog-search-field">
                            <span className="catalog-search-icon">🔍</span>
                            <input
                                ref={searchInputRef}
                                id="catalog-floating-search-input"
                                className="catalog-search-input"
                                type="search"
                                aria-label="Buscar item no catálogo"
                                placeholder="Busque aqui"
                                value={search}
                                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                            />
                        </div>
                        <button
                            type="button"
                            className="catalog-search-toggle"
                            aria-controls="catalog-floating-categories catalog-floating-search-input"
                            aria-expanded={isFloatingSearchExpanded}
                            aria-label={isFloatingSearchExpanded ? 'Recolher busca e categorias' : 'Abrir busca e categorias'}
                            onClick={() => {
                                const willExpand = !isFloatingSearchExpanded;
                                setIsFloatingSearchExpanded(willExpand);
                                if (willExpand) window.requestAnimationFrame(() => searchInputRef.current?.focus());
                            }}
                        >
                            <svg className="catalog-search-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="11" cy="11" r="6.5" />
                                <path d="m16 16 4 4" />
                            </svg>
                        </button>
                    </div>
                    <div id="catalog-floating-categories" className="catalog-floating-categories" role="group" aria-label="Categorias do catálogo">
                        {categories.map((category) => (
                            <button
                                type="button"
                                key={category.id}
                                className={`catalog-floating-category-btn ${selectedCategoryId === category.id ? 'active' : ''}`}
                                aria-pressed={selectedCategoryId === category.id}
                                onClick={() => { setCategoryFilter(category.id); setPage(1); }}
                            >
                                {isDefaultCategory(category) ? 'Todos' : category.nome}
                            </button>
                        ))}
                    </div>
                    </div>
                </div>,
                document.body,
            )}
            <nav className="catalog-nav" aria-label="Catálogo">
                <a href="/" className="catalog-brand">◈ <span>Catálogo de locação</span></a>
                <div className="catalog-nav-links">
                    <a href="#catalog-items">Produtos</a>
                    <button
                        type="button"
                        className="catalog-nav-button"
                        disabled={isLoadingEmpresa}
                        onClick={() => setIsOpen(true)}
                    >
                        Sobre nós
                    </button>
                </div>
            </nav>
            {/* ── Hero ── */}
            <header className="catalog-hero">
                <div className="catalog-hero-bg" />
                <div className="catalog-hero-content">
                    {isLoadingEmpresa ? (
                        <div className="catalog-company-skeleton" role="status" aria-label="Carregando informações da empresa">
                            <span className="catalog-loading-label">Carregando informações da empresa...</span>
                            <Skeleton className="catalog-skeleton-company-name" />
                            <Skeleton className="catalog-skeleton-logo" />
                            <Skeleton className="catalog-skeleton-slogan" />
                        </div>
                    ) : (
                        <>
                            <h1 className="catalog-hero-title">{genericCompany ? 'Catálogo de locação' : empresaData.nome}</h1>
                            <p className="catalog-hero-tag">
                                {genericCompany ? 'Encontre o que precisa para o seu próximo projeto.' : empresaData.slogan || 'Encontre o que precisa para o seu próximo projeto.'}
                            </p>
                            {logo && <img className="catalog-company-logo" src={logo} alt={`Logo de ${empresaData?.nome || 'nossa empresa'}`} />}
                        </>
                    )}
                    <div className="catalog-highlights" aria-label="Explore o catálogo">
                        <span>✦ Produtos para alugar</span><span>◷ Valores por diária</span>
                    </div>
                    {/* Search bar */}
                    <div className="catalog-search-anchor" ref={searchAnchorRef}>
                        <div className="catalog-search-wrap">
                            <div className="catalog-search-field">
                                <span className="catalog-search-icon">🔍</span>
                                <input
                                    id="catalog-search-input"
                                    className="catalog-search-input"
                                    type="search"
                                    aria-label="Buscar item no catálogo"
                                    placeholder="Busque aqui"
                                    value={search}
                                    onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Filters + Stats ── */}
            <div className="catalog-toolbar" id="catalog-items">
                <div className="catalog-filters">
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            className={`catalog-filter-btn ${selectedCategoryId === category.id ? 'active' : ''}`}
                            aria-pressed={selectedCategoryId === category.id}
                            onClick={() => { setCategoryFilter(category.id); setPage(1); }}
                        >
                            {isDefaultCategory(category) ? 'Todos' : category.nome}
                        </button>
                    ))}
                    {!isLoadingCategories && categories.length === 0 && <span className="catalog-no-categories">Nenhuma categoria cadastrada</span>}
                </div>
                <label className="catalog-sort">Ordenar por
                    <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
                        <option value="name">Nome</option><option value="price">Menor diária</option>
                    </select>
                </label>
                <span className="catalog-count" aria-live="polite">
                    {isLoading ? <Skeleton className="catalog-skeleton-count" /> : <>{estoqueRes?.total ?? 0} {estoqueRes?.total === 1 ? 'item' : 'itens'}</>}
                </span>
            </div>

            {/* ── Grid ── */}
            <main className="catalog-main">
                {isLoading ? (
                    <CatalogLoadingGrid />
                ) : isError ? (
                    <div className="catalog-empty" role="alert"><p>Não foi possível carregar o catálogo.</p><button className="catalog-clear-btn" onClick={() => void refetch()}>Tentar novamente</button></div>
                ) : items.length === 0 ? (
                    <div className="catalog-empty">
                        <div className="catalog-empty-icon">📭</div>
                        <p>Nenhum item encontrado.</p>
                        {search && (
                            <button className="catalog-clear-btn" onClick={() => { setSearch(''); setPage(1); }}>
                                Limpar busca
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={`catalog-results ${isUpdatingItems ? 'catalog-results--updating' : ''}`} aria-busy={isUpdatingItems}>
                        {isUpdatingItems && <div className="catalog-refresh-bar" role="status"><span>Atualizando produtos...</span></div>}
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
                    </div>
                )}
                {!isLoading && !isError && (estoqueRes?.totalPaginas ?? 0) > 1 && (
                    <nav className="catalog-pagination" aria-label="Páginas do catálogo">
                        <button disabled={page === 1 || isFetching} onClick={() => setPage(page - 1)}>← Anterior</button>
                        <span>Página {page} de {estoqueRes?.totalPaginas}</span>
                        <button disabled={isFetching || page >= (estoqueRes?.totalPaginas ?? 1)} onClick={() => setPage(page + 1)}>Próxima →</button>
                    </nav>
                )}
            </main>

            {/* ── Footer ── */}
            <footer className="catalog-footer" id="catalog-contact">
                {isLoadingAtendentes ? (
                    <div className="catalog-contact-skeleton" role="status" aria-label="Carregando contatos">
                        <span className="catalog-loading-label">Carregando contatos...</span>
                        <Skeleton className="catalog-skeleton-contact-title" />
                        <div className="catalog-footer-links">
                            <Skeleton className="catalog-skeleton-contact-button" />
                            <Skeleton className="catalog-skeleton-contact-button" />
                        </div>
                    </div>
                ) : atendentes.length > 0 ? (
                    <div className="catalog-footer-contacts">
                        <p>Fale com um de nossos atendentes (WhatsApp):</p>
                        <div className="catalog-footer-links">
                            {atendentes.map((a) => (
                                <a
                                    key={a.id}
                                    href={makeWhatsAppLink(a.whatsapp!, 'equipamento')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="catalog-whatsapp-btn"
                                >
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
                    key={selectedItem.id}
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                />
            )}
            {isOpen && (
                <Modal
                    title={empresaData?.nome ?? "Quem somos"}
                    open={isOpen}
                    size="lg"
                    onClose={() => setIsOpen(false)}
                >
                    <section className="catalog-about catalog-about--modal" id="sobre-nos">
                        <div className="catalog-about-content">
                            <p className="catalog-section-tag">QUEM SOMOS</p>
                            <p>{empresaData?.sobreNos?.trim() || 'Explore nosso catálogo e fale com nossa equipe para saber mais sobre os produtos e as condições de locação.'}</p>
                        </div>
                    </section>
                </Modal>
            )}
        </div>
    );
}
