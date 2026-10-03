export interface CapabilityDescriptor {
  id: string;
  provides: string[];
  activationCost: number;
  locality: 'local' | 'external';
  available: boolean;
  core?: boolean;
  prerequisite?: string;
}

export interface CapabilitySelection {
  active: CapabilityDescriptor[];
  inactive: CapabilityDescriptor[];
  missingRequired: string[];
  missingOptional: string[];
  blocked: boolean;
  considered: number;
}

export interface CapabilitySelectionInput {
  required: string[];
  optional?: string[];
  descriptors: CapabilityDescriptor[];
}

export function selectCapabilities(input: CapabilitySelectionInput): CapabilitySelection {
  const ordered = [...input.descriptors].sort((a, b) => Number(Boolean(b.core)) - Number(Boolean(a.core)) || a.activationCost - b.activationCost || (a.locality === b.locality ? 0 : a.locality === 'local' ? -1 : 1) || a.id.localeCompare(b.id));
  const needed = new Set(input.required);
  const active: CapabilityDescriptor[] = [];
  for (const descriptor of ordered) {
    if (!descriptor.available) continue;
    const coversNeeded = descriptor.provides.some(capability => needed.has(capability));
    if (!coversNeeded) continue;
    active.push(descriptor);
    for (const capability of descriptor.provides) needed.delete(capability);
  }
  const activeIds = new Set(active.map(item => item.id));
  const availableCapabilities = new Set(active.flatMap(item => item.provides));
  const missingOptional = [...new Set(input.optional ?? [])].filter(capability => !availableCapabilities.has(capability));
  const missingRequired = [...needed];
  return {
    active,
    inactive: input.descriptors.filter(item => !activeIds.has(item.id)),
    missingRequired,
    missingOptional,
    blocked: missingRequired.length > 0,
    considered: input.descriptors.length,
  };
}
