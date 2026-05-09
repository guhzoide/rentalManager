import { isoGetDate } from "@/utils/isoGetDate";

export const isoentidadeValidator = {
    async validate(data: any, tx?: any, originalData?: any) {
        // Se for um novo registro (sem código) e sem data de cadastro, preenche automaticamente
        if (!data.ISOEnt_Codigo && data.ISOEnt_DataCadastro == null) {
            data.ISOEnt_DataCadastro = isoGetDate();
        }
    }
};
