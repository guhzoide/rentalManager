import fs from 'fs';

/**
 * Lê uma chave de um arquivo web.config (formato XML).
 */
export function readWebConfigKey(filePath: string, key: string): string {
    if (!fs.existsSync(filePath)) return '';
    const content = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(`<add key="${key}" value="(.*?)"`, 'i');
    const match = content.match(regex);
    return match ? match[1] : '';
}

/**
 * Escreve configurações em um arquivo web.config.
 */
export function writeWebConfig(filePath: string, encryptedEntries: any, rawEntries: any, isOracle: boolean) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    const updates = {
        'Connection-Default-Datasource': encryptedEntries.ServerDS,
        'Connection-Default-DB': encryptedEntries.Database,
        'Connection-Default-User': encryptedEntries.Name,
        'Connection-Default-Password': encryptedEntries.Password
    };

    for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`(<add key="${key}" value=")[^"]*(")`, 'i');
        content = content.replace(regex, `$1${value}$2`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Escreve configurações em um arquivo appsettings.json.
 */
export function writeAppSettings(filePath: string, encryptedEntries: any, rawEntries: any, isOracle: boolean) {
    if (!fs.existsSync(filePath)) return;
    try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Exemplo de estrutura comum em appsettings.json
        if (content.ConnectionStrings) {
            const dbUrl = isOracle
                ? `oracle://${rawEntries.Name}:${rawEntries.Password}@${rawEntries.ServerDS}`
                : `sqlserver://${rawEntries.ServerDS};database=${rawEntries.Database};user=${rawEntries.Name};password=${rawEntries.Password};encrypt=true;trustServerCertificate=true;`;
            
            content.ConnectionStrings.DefaultConnection = dbUrl;
        }

        fs.writeFileSync(filePath, JSON.stringify(content, null, 4), 'utf8');
    } catch (e) {
        console.error('Erro ao escrever appsettings.json:', e);
    }
}
