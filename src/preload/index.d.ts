import type { ApiBerger } from './index'

declare global {
  interface Window {
    berger: ApiBerger
  }
}
