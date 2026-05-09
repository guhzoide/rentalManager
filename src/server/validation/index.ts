export interface GenericValidator {
  validate?: (data: any, tx?: any, originalData?: any) => Promise<any>;
  beforeSave?: (data: any, tx?: any, tableName?: string) => Promise<void>;
  afterSave?: (record: any, tx?: any, tableName?: string) => Promise<void>;
  beforeDelete?: (data: any, tx?: any, tableName?: string) => Promise<void>;
  afterDelete?: (record: any, tx?: any, tableName?: string) => Promise<void>;
}

const validators: Record<string, GenericValidator> = {
  // Adicione validadores aqui conforme necessário
};

export function getValidator(tableName: string): GenericValidator | null {
  return validators[tableName] || null;
}