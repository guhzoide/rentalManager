import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SearchRounded from '@mui/icons-material/SearchRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import ToysOutlined from '@mui/icons-material/ToysOutlined';
import CelebrationOutlined from '@mui/icons-material/CelebrationOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import StraightenRounded from '@mui/icons-material/StraightenRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import WhatsApp from '@mui/icons-material/WhatsApp';
import { trpc } from '@/lib/trpc';
import { base64Image } from '@/lib/images';
import { catalogWhatsAppLink } from '@/lib/catalog';
import { isDefaultCategory } from '@/lib/categories';
import { CatalogCard, CatalogItemDialog, type CatalogItem } from '@/components/catalog/CatalogProduct';
import { CatalogPartyShowcase } from '@/components/catalog/CatalogPartyShowcase';
import { CatalogDialog } from '@/components/catalog/CatalogDialog';
import '@/styles/CatalogPage.css';

function Skeleton({ className = '' }: { className?: string }) {
    return <span className={`catalog-skeleton ${className}`} aria-hidden="true" />;
}

function CatalogLoadingGrid() {
    return <div className="catalog-grid" role="status" aria-label="Carregando brinquedos">
        {Array.from({ length: 6 }, (_, index) => <div className="catalog-card catalog-card-skeleton" key={index}>
            <Skeleton className="catalog-skeleton-image" />
            <div className="catalog-card-body"><Skeleton className="catalog-skeleton-category" /><Skeleton className="catalog-skeleton-title" /><Skeleton className="catalog-skeleton-line" /></div>
            <div className="catalog-card-footer"><Skeleton className="catalog-skeleton-price" /></div>
        </div>)}
    </div>;
}

export function CatalogPage() {
    const pageRef = useRef<HTMLDivElement>(null);
    const searchAnchorRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const mainSearchRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const floatingToggleRef = useRef<HTMLButtonElement>(null);
    const [sort, setSort] = useState('name');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [page, setPage] = useState(1);
    const [aboutOpen, setAboutOpen] = useState(false);
    const [isSearchFloating, setIsSearchFloating] = useState(false);
    const [floatingExpanded, setFloatingExpanded] = useState(false);
    const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | undefined>();

    useEffect(() => {
        const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(timeout);
    }, [search]);

    useEffect(() => {
        const pageElement = pageRef.current;
        const anchor = searchAnchorRef.current;
        if (!pageElement || !anchor) return;
        let frame = 0;
        const update = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(() => {
                frame = 0;
                const floating = anchor.getBoundingClientRect().bottom <= 12;
                if (!floating && document.activeElement === searchInputRef.current) mainSearchRef.current?.focus({ preventScroll: true });
                setIsSearchFloating(floating);
            });
        };
        pageElement.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
        return () => {
            pageElement.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, []);

    useEffect(() => {
        const pageElement = pageRef.current;
        if (!pageElement || !isSearchFloating || !floatingExpanded) return;
        const collapse = () => {
            if (!document.activeElement?.closest('.catalog-floating-search')) setFloatingExpanded(false);
        };
        pageElement.addEventListener('scroll', collapse, { passive: true });
        return () => pageElement.removeEventListener('scroll', collapse);
    }, [isSearchFloating, floatingExpanded]);

    const { data: categoriesRes, isLoading: categoriesLoading } = trpc.categorias.list.useQuery({ pagina: 1, limit: 1000 });
    const categories = [...(categoriesRes?.data ?? [])]
        .filter((category) => !isDefaultCategory(category))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
    const filterCategories = [{ id: '', nome: 'Todos os brinquedos' }, ...categories];
    const { data: estoqueRes, isLoading, isFetching, isError, refetch } = trpc.estoque.list.useQuery({
        pagina: page,
        limit: 12,
        filtros: {
            ativo: true,
            exibirCatalogo: true,
            ...(debouncedSearch ? { nome: { contains: debouncedSearch, mode: 'insensitive' } } : {}),
            ...(categoryFilter ? { categoriaId: categoryFilter } : {}),
        },
        orderBy: sort === 'price' ? { valorDiaria: 'asc', id: 'asc' } : { nome: 'asc', id: 'asc' },
    }, {
        enabled: !categoriesLoading,
        placeholderData: (previousData) => previousData,
    });
    const { data: attendants, isLoading: contactsLoading } = trpc.usuarios.listAtendentes.useQuery();
    const contacts = (attendants ?? []).filter((person) => catalogWhatsAppLink(person.whatsapp));
    const { data: empresa, isLoading: companyLoading } = trpc.empresa.catalog.useQuery();
    const companyName = empresa?.nome || 'Brinquedos para a sua festa';
    const logo = base64Image(empresa?.logoUrl);
    const items = estoqueRes?.data ?? [];
    const catalogLoading = isLoading || categoriesLoading;
    const updating = !catalogLoading && (isFetching || search.trim() !== debouncedSearch);
    const hasFilters = !!search || !!categoryFilter;

    const openItem = (item: CatalogItem, image?: string) => {
        setSelectedItem(item);
        setSelectedImage(image);
    };

    const changeSearch = (value: string) => { setSearch(value); setPage(1); };
    const changeCategory = (id: string) => { setCategoryFilter(id); setPage(1); };
    const clearFilters = () => { setSearch(''); setCategoryFilter(''); setPage(1); };
    const goToPage = (next: number) => {
        setPage(next);
        resultsRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    };

    return <div className="catalog-page" ref={pageRef}>
        <a className="catalog-skip-link" href="#catalog-items">Ir para os brinquedos</a>
        <nav className="catalog-nav" aria-label="Navegação do catálogo">
            <div className="catalog-nav-inner">
                <a href="/" className="catalog-brand" aria-label={companyName}>
                    <span className="catalog-brand-mark">{logo ? <img src={logo} alt="" /> : <ToysOutlined />}</span>
                    <span>{companyLoading ? <Skeleton className="catalog-skeleton-brand" /> : companyName}</span>
                </a>
                <div className="catalog-nav-links">
                    <a href="#catalog-items">Brinquedos</a>
                    <button type="button" disabled={companyLoading} onClick={() => setAboutOpen(true)}>Sobre nós</button>
                    {contacts.length > 0 && <a href="#catalog-contact" className="catalog-nav-contact"><WhatsApp fontSize="small" /><span>Fale com a equipe</span></a>}
                </div>
            </div>
        </nav>

        <header className="catalog-hero">
            <div className="catalog-container catalog-hero-layout">
                <div className="catalog-hero-content">
                    <p className="catalog-eyebrow"><CelebrationOutlined />Locação de brinquedos para festas</p>
                    <h1>Uma festa para <span>brincar de verdade.</span></h1>
                    <p className="catalog-hero-description">{empresa?.slogan?.trim() || 'Escolha os brinquedos para a sua comemoração e combine os detalhes da locação com a nossa equipe.'}</p>
                    <div className="catalog-hero-actions">
                        <a className="catalog-hero-primary" href="#catalog-items">Ver brinquedos <ArrowForwardRounded fontSize="small" /></a>
                        {contacts.length > 0 && <a className="catalog-hero-secondary" href="#catalog-contact"><WhatsApp fontSize="small" />Consultar data</a>}
                    </div>
                    <div><p className="catalog-eyebrow">Para brincar e comemorar</p><h2>Brinquedos para a sua festa</h2><p className="catalog-results-intro">Veja as fotos, confira as medidas e encontre a diversão do seu evento.</p></div>
                    <div className="catalog-hero-highlights"><span><ScheduleRounded />Valores por diária</span><span><StraightenRounded />Confira as medidas</span></div>
                </div>
                <CatalogPartyShowcase items={items} onSelect={openItem} suspended={!!selectedItem || aboutOpen} />
            </div>
        </header>

        <main className="catalog-container catalog-main" id="catalog-items">
            <div className="catalog-results-heading" ref={resultsRef}>
                <div className="catalog-search-anchor" ref={searchAnchorRef}>
                    <div className="catalog-search-field">
                        <SearchRounded />
                        <input ref={mainSearchRef} id="catalog-search-input" type="search" aria-label="Buscar brinquedo no catálogo" placeholder="Busque um brinquedo…" value={search} onChange={(event) => changeSearch(event.target.value)} />
                    </div>
                </div>
            </div>
            <div className="catalog-toolbar">
                <div className="catalog-filters" role="group" aria-label="Categorias dos brinquedos">
                    {filterCategories.map((category) => <button key={category.id} type="button" className={`catalog-filter-btn ${categoryFilter === category.id ? 'active' : ''}`} aria-pressed={categoryFilter === category.id} onClick={() => changeCategory(category.id)}>{category.nome}</button>)}
                </div>
                <label className="catalog-sort"><span>Ordenar por</span><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="name">Nome do brinquedo</option><option value="price">Menor diária</option></select></label>
            </div>
            {catalogLoading ? <CatalogLoadingGrid /> : isError ? <div className="catalog-empty" role="alert"><Inventory2Outlined /><h3>Não foi possível carregar os brinquedos.</h3><p>Tente novamente para consultar o catálogo.</p><button type="button" onClick={() => void refetch()}>Tentar novamente</button></div>
                : items.length === 0 ? <div className="catalog-empty"><SearchRounded /><h3>{hasFilters ? 'Nenhum brinquedo para esta busca' : 'Nenhum brinquedo disponível no momento'}</h3><p>{hasFilters ? 'Tente outro nome ou explore as demais categorias.' : 'Fale com a nossa equipe para consultar as opções de locação.'}</p>{hasFilters && <button type="button" onClick={clearFilters}>Limpar filtros</button>}</div>
                : <div className={`catalog-results ${updating ? 'is-updating' : ''}`} aria-busy={updating}>
                    {updating && <div className="catalog-refresh-status" role="status">Atualizando brinquedos…</div>}
                    <div className="catalog-grid" inert={updating}>{items.map((item) => <CatalogCard key={item.id} item={item} onClick={() => openItem(item)} />)}</div>
                </div>}
            {!catalogLoading && !isError && (estoqueRes?.totalPaginas ?? 0) > 1 && <nav className="catalog-pagination" aria-label="Páginas do catálogo">
                <button type="button" disabled={page === 1 || isFetching} onClick={() => goToPage(page - 1)}><ArrowBackRounded fontSize="small" />Anterior</button>
                <span>Página <strong>{page}</strong> de {estoqueRes?.totalPaginas}</span>
                <button type="button" disabled={isFetching || page >= (estoqueRes?.totalPaginas ?? 1)} onClick={() => goToPage(page + 1)}>Próxima<ArrowForwardRounded fontSize="small" /></button>
            </nav>}
        </main>

        <section className="catalog-container catalog-rental-guide" aria-label="Como alugar os brinquedos">
            <div className="catalog-rental-guide-intro"><p className="catalog-eyebrow">Da escolha à brincadeira</p><h2>Sua festa, em três passos.</h2></div>
            <ol>
                <li><span><ToysOutlined /></span><div><strong>Escolha o brinquedo</strong><p>Explore as fotos e os valores de cada opção.</p></div></li>
                <li><span><StraightenRounded /></span><div><strong>Confira o espaço</strong><p>Veja as medidas e planeje o local da brincadeira.</p></div></li>
                <li><span><EventAvailableOutlined /></span><div><strong>Combine a data</strong><p>Converse com a equipe e consulte a disponibilidade.</p></div></li>
            </ol>
        </section>

        <footer className="catalog-footer" id="catalog-contact">
            <div className="catalog-container catalog-footer-inner">
                <div><p className="catalog-eyebrow">Vamos planejar a diversão?</p><h2>Já tem a data da festa?</h2><p>Conte a data, o local e o brinquedo que você gostou. Nossa equipe ajuda a combinar os detalhes da locação.</p></div>
                <div className="catalog-footer-contacts">
                    {contactsLoading ? <Skeleton className="catalog-skeleton-contact" /> : contacts.length > 0 ? contacts.map((contact) => <a className="catalog-contact-button" key={contact.id} href={catalogWhatsAppLink(contact.whatsapp)!} target="_blank" rel="noopener noreferrer"><WhatsApp fontSize="small" /><span>Falar com {contact.nome}</span><ArrowForwardRounded fontSize="small" /></a>) : <p>Entre em contato com a empresa para consultar preços e disponibilidade.</p>}
                </div>
            </div>
            <div className="catalog-container catalog-footer-bottom"><span>{companyName}</span><span>Locação de brinquedos para festas</span></div>
        </footer>

        {isSearchFloating && createPortal(<div className="catalog-page catalog-floating-scope">
            <aside className={`catalog-floating-search ${floatingExpanded ? 'is-expanded' : ''}`} aria-label="Busca e filtros do catálogo" onKeyDown={(event) => { if (event.key === 'Escape') { setFloatingExpanded(false); floatingToggleRef.current?.focus(); } }}>
                <div className="catalog-floating-search-top">
                    {floatingExpanded && <div className="catalog-search-field"><SearchRounded /><input ref={searchInputRef} id="catalog-floating-search-input" type="search" aria-label="Buscar brinquedo no catálogo" placeholder="Buscar brinquedo…" value={search} onChange={(event) => changeSearch(event.target.value)} /></div>}
                    <button type="button" ref={floatingToggleRef} className="catalog-search-toggle" aria-controls={floatingExpanded ? 'catalog-floating-filter-panel' : undefined} aria-expanded={floatingExpanded} aria-label={floatingExpanded ? 'Recolher busca e categorias' : 'Abrir busca e categorias'} onClick={() => {
                        setFloatingExpanded(!floatingExpanded);
                        if (!floatingExpanded) window.requestAnimationFrame(() => searchInputRef.current?.focus());
                    }}>{floatingExpanded ? <CloseRounded /> : <SearchRounded />}</button>
                </div>
                {floatingExpanded && <div id="catalog-floating-filter-panel" className="catalog-floating-categories" role="group" aria-label="Categorias dos brinquedos">{filterCategories.map((category) => <button type="button" key={category.id} aria-pressed={categoryFilter === category.id} onClick={() => changeCategory(category.id)}>{category.nome}</button>)}</div>}
            </aside>
        </div>, document.body)}

        {selectedItem && <CatalogItemDialog key={selectedItem.id} item={selectedItem} initialImage={selectedImage} contacts={contacts} onClose={() => setSelectedItem(null)} />}
        {aboutOpen && <CatalogDialog titleId="catalog-about-title" onClose={() => setAboutOpen(false)} className="catalog-about-dialog"><div className="catalog-about-content"><p className="catalog-eyebrow">Sobre nós</p><h2 id="catalog-about-title">{companyName}</h2><p>{empresa?.sobreNos?.trim() || 'Conheça os brinquedos disponíveis e fale com a nossa equipe para planejar a locação da sua festa.'}</p></div></CatalogDialog>}
    </div>;
}
