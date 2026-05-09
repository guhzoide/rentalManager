export const isoempentidadeValidator = {
    async validate(data: any, tx?: any, originalData?: any) {
        const entidadeCodigo = data.ISOEnt_Codigo;

        if (entidadeCodigo) {
            // Propagamos para o Cliente aninhado se ele existir no payload
            if (originalData?.ISOEntCliente) {
                originalData.ISOEntCliente.ISOEntCli_Codigo = entidadeCodigo;
            }

            // Propagamos para a Pessoa aninhada se ela existir no payload
            if (originalData?.ISOEntPessoa) {
                originalData.ISOEntPessoa.ISOEntPes_Codigo = entidadeCodigo;
            }

            // Propagamos para o Econtact aninhado se ele existir no payload
            if (originalData?.ISOEntEcontact) {
                originalData.ISOEntEcontact.ISOEnt_Codigo = entidadeCodigo;
            }

            // Propagamos para o Endereco aninhado se ele existir no payload
            if (originalData?.ISOEntEndereco) {
                originalData.ISOEntEndereco.ISOEnt_Codigo = entidadeCodigo;
            }

            // Propagamos para o Telefone aninhado se ele existir no payload
            if (originalData?.ISOEntTelefone) {
                originalData.ISOEntTelefone.ISOEnt_Codigo = entidadeCodigo;
            }

            // Propagamos para o Categoria Fiscal aninhado se ele existir no payload
            if (originalData?.ISOEntCategoriaFiscal) {
                originalData.ISOEntCategoriaFiscal.ISOEnt_Codigo = entidadeCodigo;
            }
        }
    },

};
