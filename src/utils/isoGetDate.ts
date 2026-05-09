import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Retorna um objeto Date ajustado para o fuso horário padrão (São Paulo).
 * @param date - Data opcional para conversão.
 */
export function isoGetDate(date?: string | number | Date): Date {
    // Se for string vazia ou undefined, pega o agora
    if (date === undefined || date === '') {
        return dayjs().tz('America/Sao_Paulo').toDate();
    }
    
    // Converte e garante o fuso
    return dayjs(date).tz('America/Sao_Paulo').toDate();
}
