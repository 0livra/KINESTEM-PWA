# Instrucciones Piolin

```typescript
// Tipo extraído para inspección estricta de estado
export type ExtractState<S> = S extends { getState: () => infer T } ? T : never;
export type AppState = ExtractState<typeof useAppStore>;

/**
 * Función de reseteo completo tipada con el estado inicial consolidado
 */
export const resetStore = (customState?: Partial<typeof initialStoreState>): void => {
  useAppStore.setState({
    ...initialStoreState,
    ...customState,
  });
};

/**
 * Hook selector envuelto en useShallow para el slice de usuario
 */
export function useUserStore<U>(selector: (state: UserSlice) => U): U {
  return useAppStore(useShallow(selector));
}
```
