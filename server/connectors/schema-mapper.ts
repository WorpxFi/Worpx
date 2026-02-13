interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: (value: unknown) => unknown;
}

interface SchemaMap {
  platformId: string;
  resourceType: string;
  mappings: FieldMapping[];
}

export class SchemaMapper {
  private maps: Map<string, SchemaMap> = new Map();

  private key(platformId: string, resourceType: string): string { return platformId + ':' + resourceType; }

  register(platformId: string, resourceType: string, mappings: FieldMapping[]): void {
    this.maps.set(this.key(platformId, resourceType), { platformId, resourceType, mappings });
  }

  toWorpx(platformId: string, resourceType: string, platformData: Record<string, unknown>): Record<string, unknown> {
    const schema = this.maps.get(this.key(platformId, resourceType));
    if (!schema) return platformData;
    const result: Record<string, unknown> = {};
    for (const m of schema.mappings) {
      const value = platformData[m.sourceField];
      result[m.targetField] = m.transform ? m.transform(value) : value;
    }
    return result;
  }

  fromWorpx(platformId: string, resourceType: string, worpxData: Record<string, unknown>): Record<string, unknown> {
    const schema = this.maps.get(this.key(platformId, resourceType));
    if (!schema) return worpxData;
    const result: Record<string, unknown> = {};
    for (const m of schema.mappings) {
      const value = worpxData[m.targetField];
      result[m.sourceField] = value;
    }
    return result;
  }

  hasMapping(platformId: string, resourceType: string): boolean { return this.maps.has(this.key(platformId, resourceType)); }
}