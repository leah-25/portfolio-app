import { createContext, useContext } from 'react';

interface ShellContextValue {
  openMobileNav: () => void;
}

export const ShellContext = createContext<ShellContextValue>({
  openMobileNav: () => {},
});

export function useShell() {
  return useContext(ShellContext);
}
