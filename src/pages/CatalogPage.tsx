import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

interface EstoqueItem {
  id: number;
  nome: string;
  peso: number;
  largura: number;
  altura: number;
  valorDiaria: number;
  quantidade: number;
  ativo: boolean;
}

export function CatalogPage() {
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const readMutation = trpc.service.read.useMutation({
    onSuccess: (res: any) => setItems(res.data),
  });

  useEffect(() => {
    // Busca apenas itens ativos
    readMutation.mutate({
      table: 'estoques',
      filtros: { ativo: true },
      limit: 100,
    });
  }, []);

  return (
    <div className="catalog-container" style={{
      padding: '40px 20px',
      maxWidth: '1200px',
      margin: '0 auto',
      background: 'var(--bg-primary)',
      minHeight: '100vh',
      color: 'var(--text-primary)'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, var(--text-primary), var(--accent-hover))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '10px'
        }}>
          Catálogo de Itens
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>
          Confira nossos itens disponíveis para locação
        </p>
      </header>

      {readMutation.isPending ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <span>Carregando catálogo...</span>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📦</div>
          <p>Nenhum item disponível no momento.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '30px'
        }}>
          {items.map((item) => (
            <div key={item.id} className="menu-card" style={{
              textAlign: 'left',
              alignItems: 'flex-start',
              padding: '24px',
              height: '100%'
            }}>
              <div className="menu-card-icon" style={{ background: 'var(--accent-light)', marginBottom: '16px', color: 'var(--accent)' }}>
                🏗
              </div>
              <h3 style={{ fontSize: '20px', marginBottom: '12px', color: 'var(--text-primary)' }}>{item.nome}</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Peso:</span>
                  <span>{item.peso} kg</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Dimensões:</span>
                  <span>{item.largura}m x {item.altura}m</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Disponível:</span>
                  <span style={{ color: item.quantidade > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                    {item.quantidade} un
                  </span>
                </div>
              </div>

              <div style={{
                marginTop: 'auto',
                paddingTop: '20px',
                borderTop: '1px solid var(--border)',
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Diária</span>
                  <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--success)' }}>
                    R$ {Number(item.valorDiaria).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button className="btn btn-primary btn-sm">Solicitar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
