import fs from 'fs'

import { STATE_FILE } from './loadState'

// Salva estado no arquivo
export function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}
