# Diretriz de experiência mobile-first

O Rental Manager é usado predominantemente em celulares. Toda implementação visual deve começar pela experiência entre **320px e 768px** e ser progressivamente ampliada para tablet e desktop.

## Padrões adotados

- Navegação: drawer lateral acionado pela barra superior no celular; a aba ativa é identificada pelo título da tela.
- Dados: `DataGrid` exibe cartões verticais no celular e tabela completa a partir do desktop. Não crie tabelas que dependam de rolagem horizontal para leitura normal.
- Formulários: uma coluna no celular, fonte de entrada de 16px para evitar zoom automático no iOS e botões com altura mínima de toque.
- Modais: comportam-se como bottom sheets no celular, com altura máxima baseada em `dvh`, conteúdo rolável e ações que quebram em linhas quando necessário.
- Ações e navegação: alvos de toque têm pelo menos 44px; não use hover como única forma de revelar uma ação.
- Layout: respeite `safe-area-inset-*`, `100dvh` e quebras de texto. O conteúdo não deve ficar oculto por teclado, barra do navegador ou notch.
- Movimento: transições são reduzidas para pessoas que ativam `prefers-reduced-motion`.

## Checklist para telas novas ou alteradas

1. Testar em 320px, 375px e 768px de largura, além do desktop.
2. Confirmar que inputs, selects e autocompletes continuam legíveis e tocáveis.
3. Verificar teclado virtual, rolagem vertical e fechamento de modais.
4. Verificar o fluxo completo sem mouse e sem hover.
5. Se listar registros, reutilizar `DataGrid` para receber automaticamente a representação em cartões.

## Exceção: Kanvas

O Kanvas mantém uma área de trabalho proporcional a documento A4. No celular, sua barra de ferramentas pode rolar horizontalmente e as propriedades são abertas como bottom sheet. Não reduza o documento até o ponto de tornar o conteúdo impossível de editar; preserve zoom e rolagem do canvas.
