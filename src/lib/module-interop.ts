export function unwrapCommonJsDefault<T>(moduleValue: T | { default: T }) {
  if (
    moduleValue &&
    typeof moduleValue === 'object' &&
    'default' in moduleValue &&
    (moduleValue as { default?: T }).default !== undefined
  ) {
    return (moduleValue as { default: T }).default
  }

  return moduleValue as T
}
