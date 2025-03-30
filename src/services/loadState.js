import fs from 'fs'

export const STATE_FILE = "./state.json"

// Carrega estado do bot
export function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"))
  }

  return {
    isOpened: false,
    buyPrice: 0 
  }
}
