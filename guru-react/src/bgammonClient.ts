export type CheckerColor = 'white' | 'black'

export interface CheckerSummary {
  point: number
  color: CheckerColor
  count: number
}

export interface ZoneSummary {
  color: CheckerColor
  count: number
}

export interface BgammonState {
  board: number[]
  dice: number[]
  moves: string[]
  checkers?: CheckerSummary[]
  bar?: ZoneSummary[]
  off?: ZoneSummary[]
  cubeValue?: number
  cubeOwner?: 'user' | 'opponent' | null
  scoreUser?: number
  scoreOpponent?: number
}

export type BgammonSubscriber = (state: BgammonState) => void
export type LogSubscriber = (message: string) => void

// When connecté directement à bgammon.org, on ne passe plus par des endpoints HTTP locaux.
// SERVER_URL / LOGIN_ENDPOINT / GAME_ENDPOINT ne sont plus utilisés, mais on les garde typés
// si on veut plus tard parler à un serveur HTTP intermédiaire.
const SERVER_URL = import.meta.env.VITE_BGAMMON_HTTP_URL ?? 'https://bgammon.org'
const LOGIN_ENDPOINT = '/login'
const GAME_ENDPOINT = '/game'

// WebSocket vers le serveur public bgammon.org.
// En dev, on peut override via VITE_BGAMMON_WS_URL si besoin.
const WS_URL = import.meta.env.VITE_BGAMMON_WS_URL ?? 'wss://ws.bgammon.org'

let socket: WebSocket | null = null
const subscribers = new Set<BgammonSubscriber>()
const logSubscribers = new Set<LogSubscriber>()

function logMessage(message: string) {
  // Toujours visible dans la console navigateur
  console.log('[bgammon]', message)
  // Et remonté aux abonnés React pour affichage dans le panneau de logs
  logSubscribers.forEach((handler) => {
    try {
      handler(message)
    } catch (e) {
      console.error('Error in bgammon log subscriber', e)
    }
  })
}

function notify(state: BgammonState) {
  subscribers.forEach((handler) => {
    try {
      handler(state)
    } catch (e) {
      console.error('Error in bgammon subscriber', e)
    }
  })
}

function mapBoardZones(board: number[]) {
  const checkers: CheckerSummary[] = []
  const bar: ZoneSummary[] = []
  const off: ZoneSummary[] = []

  board.forEach((value, index) => {
    // Points 0–23
    if (index >= 0 && index <= 23) {
      if (value === 0) {
        checkers.push({ point: index, color: 'white', count: 0 })
      } else {
        checkers.push({
          point: index,
          color: value > 0 ? 'white' : 'black',
          count: Math.abs(value)
        })
      }
      return
    }

    if (value === 0) return
    const count = Math.abs(value)

    // 24–27 : bar/off comme documenté dans SERVER.md
    if (index === 24) {
      bar.push({ color: 'white', count })
      return
    }
    if (index === 25) {
      bar.push({ color: 'black', count })
      return
    }
    if (index === 26) {
      off.push({ color: 'white', count })
      return
    }
    if (index === 27) {
      off.push({ color: 'black', count })
    }
  })

  return { checkers, bar, off }
}

export function parseBgammonPayload(payload: any): BgammonState {
  const board: number[] = Array.isArray(payload.Board) ? payload.Board.slice() : []
  const dice: number[] = []

  if (typeof payload.Roll1 === 'number' && payload.Roll1 > 0) dice.push(payload.Roll1)
  if (typeof payload.Roll2 === 'number' && payload.Roll2 > 0) dice.push(payload.Roll2)

  const moves: string[] = Array.isArray(payload.Moves) ? payload.Moves.slice() : []

  const { checkers, bar, off } = mapBoardZones(board)

  let cubeValue: number | undefined
  let cubeOwner: 'user' | 'opponent' | null | undefined

  if (typeof payload.DoubleValue === 'number' && payload.DoubleValue > 0) {
    cubeValue = payload.DoubleValue
  }

  if (cubeValue && typeof payload.DoublePlayer === 'number' && typeof payload.PlayerNumber === 'number') {
    cubeOwner = payload.DoublePlayer === payload.PlayerNumber ? 'user' : 'opponent'
  } else {
    cubeOwner = null
  }

  let scoreUser: number | undefined
  let scoreOpponent: number | undefined

  if (payload.Player1 && payload.Player2 && typeof payload.PlayerNumber === 'number') {
    const p1Points = typeof payload.Player1.Points === 'number' ? payload.Player1.Points : 0
    const p2Points = typeof payload.Player2.Points === 'number' ? payload.Player2.Points : 0

    if (payload.PlayerNumber === 1) {
      scoreUser = p1Points
      scoreOpponent = p2Points
    } else {
      scoreUser = p2Points
      scoreOpponent = p1Points
    }
  }

  return {
    board,
    dice,
    moves,
    checkers,
    bar,
    off,
    cubeValue,
    cubeOwner,
    scoreUser,
    scoreOpponent
  }
}

// En mode connexion directe bgammon.org, login HTTP et GET /game ne sont pas utilisés.
// On fournit des implémentations neutres pour éviter les erreurs "Failed to fetch".
export async function login(_username: string): Promise<void> {
  // Pas d'action HTTP : l'authentification se fait via la commande loginjson
  // envoyée sur le WebSocket dans connect().
  return
}

export async function fetchInitialGameState(): Promise<BgammonState> {
  // Aucune requête HTTP initiale : on attend simplement les events JSON
  // provenant de bgammon.org.
  return {
    board: [],
    dice: [],
    moves: []
  }
}

export async function connect(username: string): Promise<void> {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return
  }

  return new Promise((resolve, reject) => {
    try {
      socket = new WebSocket(WS_URL)
    } catch (err) {
      logMessage('Failed to create WebSocket: ' + String(err))
      reject(err)
      return
    }

    if (!socket) {
      const err = new Error('Failed to create WebSocket')
      logMessage(err.message)
      reject(err)
      return
    }

    socket.onopen = () => {
      // bgammon.org attend un login avant toute autre commande.
      // On utilise loginjson pour activer le mode JSON.
      // Format : loginjson <client> [username] [password]
      const clientId = 'gurugammon-react-v0.1/en'
      const cmd = `loginjson ${clientId} ${username}\n`
      try {
        socket!.send(cmd)
      } catch (e) {
        logMessage('Failed to send loginjson: ' + String(e))
      }
      logMessage(`WebSocket connected to ${WS_URL} as ${username}`)
      resolve()
    }

    socket.onerror = (event) => {
      try {
        logMessage('WebSocket error: ' + JSON.stringify(event))
      } catch {
        logMessage('WebSocket error')
      }
    }

    socket.onclose = () => {
      logMessage('WebSocket connection closed')
      socket = null
    }

    socket.onmessage = (event: MessageEvent<string>) => {
      const data = event.data
      if (!data) return

      try {
        const json = JSON.parse(data)
        const state = parseBgammonPayload(json)
        notify(state)
      } catch (e) {
        // Certains messages peuvent ne pas être du JSON d’état ; on les ignore.
        logMessage('Unable to parse message from server: ' + String(e))
      }
    }
  })
}

export function disconnect() {
  if (socket) {
    socket.close()
    socket = null
  }
}

export function subscribe(handler: BgammonSubscriber) {
  subscribers.add(handler)
}

export function unsubscribe(handler: BgammonSubscriber) {
  subscribers.delete(handler)
}

export function subscribeLog(handler: LogSubscriber) {
  logSubscribers.add(handler)
}

export function unsubscribeLog(handler: LogSubscriber) {
  logSubscribers.delete(handler)
}
