import { isoGetDate } from "@/utils/isoGetDate";


export const isoentclienteValidator = {
    async validate(data: any) {
        await handleDependencies(data);

        if (data.ISOEntCli_DataCadastro == null) {
            data.ISOEntCli_DataCadastro = isoGetDate()
        } else {
            data.ISOEntCli_DataCadastro = data.ISOEntCli_DataCadastro
        }
    },
};


/**
 * Executado ANTES de se criar um registro em ISOEntUsuario.
 * Delega o create/update para o ecosistema isoservice.
 */
async function handleDependencies(data: any) {

    if (!data.ISOEntCli_UsuarioCadastro || data.ISOEntCli_UsuarioCadastro == 0)
        data.ISOEntCli_UsuarioCadastro = data.ISOEntCli_UsuarioAlteracao

}