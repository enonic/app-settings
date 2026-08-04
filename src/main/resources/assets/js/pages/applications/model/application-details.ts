export type SystemVersionPhrase = {
  labelKey: string;
  args: readonly string[];
};

/**
 * The phrase and arguments for the platform versions an application accepts. `undefined` where the
 * descriptor names neither bound, so the field is left out rather than rendered empty.
 */
export function systemVersionPhrase(min?: string, max?: string): SystemVersionPhrase | undefined {
  if (min != null && max != null) {
    return { labelKey: 'applications.details.systemVersionRange', args: [min, max] };
  }

  if (min != null) {
    return { labelKey: 'applications.details.systemVersionFrom', args: [min] };
  }

  if (max != null) {
    return { labelKey: 'applications.details.systemVersionUpTo', args: [max] };
  }

  return undefined;
}
