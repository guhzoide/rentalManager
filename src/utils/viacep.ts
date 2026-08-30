import { success } from "zod";

export async function getCep(cep: string) {
    try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
            const result = {
                success: true,
                data
            }
            return result;
        } else {
            const result = {
                success: false,
                data: null
            }
            return result;
        }
    } catch (err) {
        console.error("ViaCEP error: ", err);
        const result = {
            success: false,
            data: null
        }
        return result;
    }
}