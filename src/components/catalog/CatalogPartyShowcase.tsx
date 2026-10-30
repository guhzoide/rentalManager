import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import PauseRounded from '@mui/icons-material/PauseRounded';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import CelebrationOutlined from '@mui/icons-material/CelebrationOutlined';
import { buildCatalogSlides } from '@/lib/catalogSlides';
import type { CatalogItem } from './CatalogProduct';

function subscribeMotion(notify: () => void) {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    media.addEventListener('change', notify);
    return () => media.removeEventListener('change', notify);
}

function subscribeVisibility(notify: () => void) {
    document.addEventListener('visibilitychange', notify);
    return () => document.removeEventListener('visibilitychange', notify);
}

const getReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const getPageVisible = () => document.visibilityState === 'visible';

function PartyArtwork() {
    return <svg className="catalog-party-artwork" viewBox="0 0 480 330" fill="none" aria-hidden="true">
        <ellipse cx="242" cy="298" rx="180" ry="15" fill="#e9def5" />
        <path d="M75 107c-20 53 24 63 9 113M405 93c26 51-16 67-5 109" stroke="#a3aac2" strokeWidth="2" />
        <ellipse cx="74" cy="84" rx="24" ry="32" transform="rotate(-12 74 84)" fill="#ffb99b" />
        <path d="m77 115 8 9-12 1" fill="#ff9c78" />
        <ellipse cx="407" cy="65" rx="24" ry="32" transform="rotate(10 407 65)" fill="#f9d378" />
        <path d="m405 96 6 11-12-2" fill="#e9b64d" />
        <rect x="117" y="158" width="247" height="123" rx="19" fill="#a6c8fc" />
        <rect x="103" y="130" width="51" height="158" rx="18" fill="#c9b6fa" />
        <rect x="329" y="130" width="51" height="158" rx="18" fill="#b09ae6" />
        <path d="M96 139c-4 0-6-4-3-7l33-43c2-3 6-3 8 0l32 43c3 3 1 7-3 7H96Z" fill="#ffab8d" />
        <path d="M321 139c-4 0-6-4-3-7l33-43c2-3 6-3 8 0l32 43c3 3 1 7-3 7h-70Z" fill="#ffc965" />
        <path d="M198 281v-65a43 43 0 0 1 86 0v65" fill="#fff5e8" />
        <path d="M212 281v-61a29 29 0 0 1 58 0v61" fill="#7866ad" />
        <rect x="94" y="276" width="296" height="23" rx="11" fill="#9ecfb8" />
        <path d="M171 158h139v20H171z" fill="#bed8ff" />
        <path d="m239 117 7 13 15 2-11 10 3 15-14-7-13 7 2-15-11-10 15-2 7-13Z" fill="#fff3bb" />
        <circle cx="63" cy="267" r="17" fill="#ffba9d" /><path d="M49 258c16 1 22 12 22 25" stroke="#fff0e7" strokeWidth="5" />
        <circle cx="410" cy="276" r="19" fill="#f5d680" /><path d="M395 266c18-1 26 8 29 19" stroke="#fff0c9" strokeWidth="5" />
        <path d="m172 48 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1 4-9ZM329 32l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1 3-7Z" fill="#b8a1e7" />
        <path d="m120 39 8 6M358 77l9-7M52 174l8 4M429 179l-8 6" stroke="#e5b679" strokeWidth="4" strokeLinecap="round" />
        <circle cx="216" cy="44" r="4" fill="#9ecfb8" /><circle cx="291" cy="82" r="4" fill="#ffb99b" />
    </svg>;
}

export function CatalogPartyShowcase({ items, onSelect, suspended = false }: {
    items: CatalogItem[];
    onSelect: (item: CatalogItem, image?: string) => void;
    suspended?: boolean;
}) {
    const slides = useMemo(() => buildCatalogSlides(items), [items]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [playback, setPlayback] = useState<boolean | null>(null);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [inView, setInView] = useState(true);
    const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, () => true);
    const pageVisible = useSyncExternalStore(subscribeVisibility, getPageVisible, () => false);
    const regionRef = useRef<HTMLDivElement>(null);
    const dotsRef = useRef<HTMLDivElement>(null);
    const touchStart = useRef<{ x: number; y: number } | null>(null);
    const suppressClickUntil = useRef(0);
    const activeIndex = Math.max(0, slides.findIndex((slide) => slide.id === activeId));
    const active = slides[activeIndex];
    const wantsPlayback = playback ?? !reducedMotion;
    const rotating = wantsPlayback && !hovered && !focused && inView && pageVisible && !suspended && slides.length > 1;

    useEffect(() => {
        const element = regionRef.current;
        if (!element || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= .15), { threshold: .15 });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!rotating) return;
        const timer = window.setInterval(() => {
            const control = document.activeElement;
            if (regionRef.current?.contains(control) && !control?.closest('.catalog-carousel-playback')) return;
            setActiveId(slides[(activeIndex + 1) % slides.length].id);
        }, 5000);
        return () => window.clearInterval(timer);
    }, [rotating, slides, activeIndex]);

    useEffect(() => {
        const container = dotsRef.current;
        const selected = container?.querySelector<HTMLElement>('[aria-current="true"]');
        if (container && selected) container.scrollTo({ left: selected.offsetLeft - container.clientWidth / 2 + selected.clientWidth / 2, behavior: reducedMotion ? 'instant' : 'smooth' });
    }, [activeIndex, reducedMotion]);

    const showSlide = (index: number) => {
        if (!slides.length) return;
        setPlayback(false);
        setActiveId(slides[(index + slides.length) % slides.length].id);
    };

    return <div className="catalog-party-showcase" ref={regionRef}>
        <span className="catalog-party-spark catalog-party-spark--one" aria-hidden="true">✦</span>
        <span className="catalog-party-spark catalog-party-spark--two" aria-hidden="true">✧</span>
        <span className="catalog-party-orbit" aria-hidden="true" />
        <span className="catalog-party-label"><CelebrationOutlined />O próximo sorriso começa aqui</span>
        {active ? <div className="catalog-showcase-carousel" role="region" aria-roledescription="carrossel" aria-label="Brinquedos em destaque"
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
            }}
            onKeyDown={(event) => {
                if (slides.length < 2 || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
                event.preventDefault();
                showSlide(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
            }}>
            <div className="catalog-carousel-stage" role="group" aria-roledescription="slide" aria-label={`${activeIndex + 1} de ${slides.length}`}
                onPointerDown={(event) => {
                    if (event.pointerType === 'touch' || event.pointerType === 'pen') touchStart.current = { x: event.clientX, y: event.clientY };
                }}
                onPointerCancel={() => { touchStart.current = null; }}
                onPointerUp={(event) => {
                    const start = touchStart.current;
                    touchStart.current = null;
                    if (!start || slides.length < 2) return;
                    const dx = event.clientX - start.x;
                    const dy = event.clientY - start.y;
                    if (Math.abs(dx) < 48 || Math.abs(dy) > Math.abs(dx) / 2) return;
                    suppressClickUntil.current = performance.now() + 350;
                    showSlide(activeIndex + (dx < 0 ? 1 : -1));
                }}>
                <button type="button" className="catalog-party-feature" onClick={() => {
                    if (performance.now() < suppressClickUntil.current) return;
                    onSelect(active.item, active.image);
                }} aria-label={`Conhecer ${active.item.nome}, foto ${active.imageIndex + 1}`}>
                    <span className="catalog-party-feature-image"><img key={active.id} src={active.image} alt={`${active.item.nome} — foto ${active.imageIndex + 1}`} fetchPriority="high" draggable={false} /></span>
                    <span className="catalog-party-feature-caption"><span><small>Um convite para brincar</small><strong title={active.item.nome}>{active.item.nome}</strong></span><span className="catalog-party-feature-arrow"><ArrowForwardRounded /></span></span>
                </button>
                {slides.length > 1 && <>
                    <button type="button" className="catalog-carousel-arrow is-previous" onClick={() => showSlide(activeIndex - 1)} aria-label="Foto anterior"><ChevronLeftRounded /></button>
                    <button type="button" className="catalog-carousel-arrow is-next" onClick={() => showSlide(activeIndex + 1)} aria-label="Próxima foto"><ChevronRightRounded /></button>
                </>}
            </div>
            {slides.length > 1 && <div className="catalog-carousel-navigation">
                <span className="catalog-carousel-count" aria-live={rotating ? 'off' : 'polite'} aria-atomic="true">{activeIndex + 1} / {slides.length}</span>
                <div className="catalog-carousel-dots" ref={dotsRef} role="group" aria-label="Escolher foto do destaque">
                    {slides.map((slide, index) => <button type="button" key={slide.id} aria-label={`Mostrar foto ${index + 1}: ${slide.item.nome}`} aria-current={activeIndex === index ? 'true' : undefined} onClick={() => showSlide(index)}><span /></button>)}
                </div>
                <button type="button" className="catalog-carousel-playback" onClick={(event) => {
                    const play = !wantsPlayback;
                    setPlayback(play);
                    if (play) { event.currentTarget.focus({ preventScroll: true }); setHovered(false); setFocused(false); }
                }} aria-label={wantsPlayback ? 'Pausar troca automática de fotos' : 'Ativar troca automática de fotos'} aria-pressed={!wantsPlayback}>{wantsPlayback ? <PauseRounded fontSize="small" /> : <PlayArrowRounded fontSize="small" />}</button>
            </div>}
        </div> : <div className="catalog-party-fallback"><PartyArtwork /><span>Grandes momentos começam com uma boa brincadeira.</span></div>}
        <span className="catalog-party-footnote"><i /><span>Veja as fotos. Imagine a festa.</span></span>
    </div>;
}
