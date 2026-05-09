
import { isoserviceCreate, isoserviceRead } from "../services/isoserviceService";

export const isoEntTelefoneValidator = {
    async validate(data: any, tx?: any, originalData?: any) {
        // Se o telefone não está sendo definido como Principal, não precisamos desmarcar os outros.
        // Isso também evita o loop infinito quando este validador é chamado pelas atualizações de 'S' para 'N'.
        if (data.ISOEntTel_Principal !== 'S') {
            return;
        }

        const retornoRead = await isoserviceRead({
            table: 'ISOEntTelefone',
            filtros: {
                ISOEnt_Codigo: data.ISOEnt_Codigo,
                ISOEntTel_Principal: "S"
            }
        });

        const telListaPrincipalOff: any[] = [];

        if (retornoRead.success && retornoRead.retorno) {
            for (const obTel of retornoRead.retorno) {
                // Não desmarcar o próprio registro que está sendo salvo agora
                if (obTel.ISOEntTel_Codigo !== data.ISOEntTel_Codigo) {
                    const dataTel = { ...obTel };
                    dataTel.ISOEntTel_Principal = 'N';
                    telListaPrincipalOff.push(dataTel);
                }
            }
        }

        if (telListaPrincipalOff.length > 0) {
            await isoserviceCreate({
                table: 'ISOEntTelefone',
                Itens: telListaPrincipalOff
            });
        }
    }
}
