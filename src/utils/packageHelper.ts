import path from 'path';

/**
 * Retorna o caminho raiz do pacote legado.
 */
export function getPackageRoot(): string {
    return process.env.ISO_PACKAGE_ROOT || '/var/www/isocrm';
}

/**
 * Retorna o caminho para o gerenciador de logos.
 */
export function getLogosManagerPath(): string {
    return path.join(getPackageRoot(), 'isoCRM_Config', 'logos');
}

/**
 * Retorna o caminho para o gerenciador de ambiente.
 */
export function getEnvManagerPath(): string {
    return path.join(getPackageRoot(), 'isoCRM_Config', 'env');
}

/**
 * Retorna caminhos conhecidos de configuração.
 */
export function getKnownPaths(root: string) {
    return {
        configs: [
            path.join(root, 'isoCRM_Nucleo', 'web', 'web.config'),
            path.join(root, 'isoCRM_Config', 'log.config')
        ],
        appsettings: [
            path.join(root, 'isoCRM_Nucleo', 'web', 'appsettings.json')
        ]
    };
}

/**
 * Retorna o caminho para o gerenciador de configuração.
 */
export function getConfigManagerPath(): string {
    return path.join(getPackageRoot(), 'isoCRM_Config');
}

/**
 * Retorna o caminho para o gerenciador de TSNames (Oracle).
 */
export function getTsnamesManagerPath(): string {
    return path.join(getPackageRoot(), 'isoCRM_Config', 'tsnames');
}
