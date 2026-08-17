import type {
  AuthoritativeServiceBinding,
  OrchestrationStep,
} from "./types";

export class ServiceBindingRegistry {
  private readonly bindings = new Map<string, AuthoritativeServiceBinding>();

  register(binding: AuthoritativeServiceBinding): void {
    if (!binding.key.trim()) {
      throw new Error("Service binding requires a key.");
    }
    if (this.bindings.has(binding.key)) {
      throw new Error(`Duplicate service binding: ${binding.key}`);
    }
    this.bindings.set(binding.key, binding);
  }

  get(key: string): AuthoritativeServiceBinding | undefined {
    return this.bindings.get(key);
  }

  has(key: string): boolean {
    return this.bindings.has(key);
  }

  toReadonlyMap(): ReadonlyMap<string, AuthoritativeServiceBinding> {
    return this.bindings;
  }
}

export function validateServiceBindings(
  steps: OrchestrationStep[],
  services: ReadonlyMap<string, AuthoritativeServiceBinding>
): string[] {
  return steps
    .filter(step => !services.has(step.authoritativeService))
    .map(step => `${step.id}:UNBOUND_SERVICE:${step.authoritativeService}`);
}
