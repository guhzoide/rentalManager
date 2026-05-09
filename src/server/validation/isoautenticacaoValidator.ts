import { GenericValidator } from './index';

/**
 * Validador para o processo de autenticação.
 */
export const isoautenticacaoValidator: GenericValidator = {
    validate: async (data, tx, usuario) => {
        // Lógica de validação de autenticação
        // Retorna códigos de calendário e fuso horário (exemplo)
        return {
            ISOCal_Codigo: usuario?.ISOEntUsu_CalCodigo || 1,
            ISOFHr_Codigo: usuario?.ISOEntUsu_FHrCodigo || 1
        };
    }
};
