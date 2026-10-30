import { useState } from 'react';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/lib/trpc';
import { base64Gallery, base64Image } from '@/lib/images';
import { catalogWhatsAppLink } from '@/lib/catalog';
import { isDefaultCategory } from '@/lib/categories';
import { formatCurrency } from '@/utils/financeUtils';
import ToysOutlined from '@mui/icons-material/ToysOutlined';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import StraightenRounded from '@mui/icons-material/StraightenRounded';
import WhatsApp from '@mui/icons-material/WhatsApp';
import { CatalogDialog } from './CatalogDialog';

export type CatalogItem = inferRouterOutputs<AppRouter>['estoque']['list']['data'][number];
export interface CatalogContact { id: string; nome: string; whatsapp?: string | null; }

function Availability({ unavailable }: { unavailable: boolean }) {
    return <span className={`catalog-availability ${unavailable ? 'is-unavailable' : ''}`}><i />{unavailable ? 'Indisponível no momento' : 'Disponível'}</span>;
}

export function CatalogCard({ item, onClick }: { item: CatalogItem; onClick: () => void }) {
    const cover = base64Image(item.imageUrl);
    return <button type="button" className="catalog-card" onClick={onClick} aria-label={`Ver detalhes de ${item.nome}. ${formatCurrency(item.valorDiaria)} por diária. ${item.disponivel > 0 ? 'Disponível' : 'Indisponível no momento'}.`}>
        <span className="catalog-card-image">
            {cover ? <img loading="lazy" decoding="async" src={cover} alt={item.nome} /> : <span className="catalog-image-placeholder"><ToysOutlined /><span>Sem imagem</span></span>}
            <Availability unavailable={item.disponivel <= 0} />
        </span>
        <span className="catalog-card-body">
            <span className="catalog-card-category">{item.categoria && !isDefaultCategory(item.categoria) ? item.categoria.nome : 'Para alugar'}</span>
            <span className="catalog-card-name">{item.nome}</span>
            <span className="catalog-card-measures"><StraightenRounded />{item.largura.toLocaleString('pt-BR')} m <span aria-hidden="true">×</span> {item.altura.toLocaleString('pt-BR')} m <span className="catalog-measures-label">largura × altura</span></span>
        </span>
        <span className="catalog-card-footer">
            <span className="catalog-card-price"><strong>{formatCurrency(item.valorDiaria)}</strong><span>/ diária</span></span>
            <span className="catalog-card-cta">Fotos e medidas <ArrowForwardRounded fontSize="small" /></span>
        </span>
    </button>;
}

export function CatalogItemDialog({ item, contacts, onClose, initialImage }: { item: CatalogItem; contacts: CatalogContact[]; onClose: () => void; initialImage?: string }) {
    const images = [...new Set(base64Gallery([item.imageUrl ?? '', ...(item.imageUrls ?? [])]))];
    const [activeImage, setActiveImage] = useState(initialImage && images.includes(initialImage) ? initialImage : images[0] ?? '');
    return <CatalogDialog titleId="catalog-item-title" onClose={onClose}>
        <div className="catalog-product-dialog">
            <div className="catalog-product-gallery">
                <div className="catalog-product-cover">
                    {activeImage ? <img src={activeImage} alt={item.nome} /> : <span className="catalog-image-placeholder"><ToysOutlined /><span>Sem imagem</span></span>}
                </div>
                {images.length > 1 && <div className="catalog-gallery-thumbnails" role="group" aria-label="Imagens do produto">
                    {images.map((image, index) => <button key={image} type="button" aria-label={`Ver imagem ${index + 1} de ${item.nome}`} aria-pressed={activeImage === image} onClick={() => setActiveImage(image)}>
                        <img src={image} alt="" />
                    </button>)}
                </div>}
            </div>
            <div className="catalog-product-info">
                <Availability unavailable={item.disponivel <= 0} />
                <p className="catalog-eyebrow">{item.categoria && !isDefaultCategory(item.categoria) ? item.categoria.nome : 'Catálogo de locação'}</p>
                <h2 id="catalog-item-title">{item.nome}</h2>
                <p className="catalog-product-intro">Confira as medidas para o espaço da sua festa e consulte a data com a nossa equipe.</p>
                <dl className="catalog-product-specs"><div><dt>Largura</dt><dd>{item.largura.toLocaleString('pt-BR')} m</dd></div><div><dt>Altura</dt><dd>{item.altura.toLocaleString('pt-BR')} m</dd></div></dl>
                <div className="catalog-product-price"><span>Valor da diária</span><strong>{formatCurrency(item.valorDiaria)}</strong></div>
                {contacts.length > 0 ? <div className="catalog-product-contacts">
                    <p>Consulte a disponibilidade para a sua data.</p>
                    {contacts.map((contact) => {
                        const link = catalogWhatsAppLink(contact.whatsapp, item.nome);
                        return link ? <a key={contact.id} className="catalog-contact-button" href={link} target="_blank" rel="noopener noreferrer"><WhatsApp fontSize="small" /><span>Falar com {contact.nome}</span><ArrowForwardRounded fontSize="small" /></a> : null;
                    })}
                </div> : <p className="catalog-product-note">Entre em contato com a equipe para confirmar a disponibilidade e as condições de locação.</p>}
            </div>
        </div>
    </CatalogDialog>;
}
