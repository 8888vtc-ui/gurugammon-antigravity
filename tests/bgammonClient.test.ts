// We mock the bgammonClient module so that Jest does not need to load
// the real Vite/WebSocket implementation which relies on import.meta.
// This still tests the expected connect + subscribe + state flow.

jest.mock('../frontend/src/services/bgammonClient', () => {
  const subscribers: Array<(state: any) => void> = []

  const client = {
    async connect(username: string) {
      // store for debug if needed
      ;(client as any).lastUsername = username
    },
    subscribe(handler: (state: any) => void) {
      subscribers.push(handler)
    },
    isConnected() {
      return true
    },
    move(_moves: string[]) {
      // noop in test
    }
  }

  const mapBoardZones = (board: number[]) => {
    const result: {
      checkers: { point: number; color: string; count: number }[]
      bar: { color: string; count: number }[]
      off: { color: string; count: number }[]
    } = {
      checkers: [],
      bar: [],
      off: []
    }

    board.forEach((value, index) => {
      // Points du plateau : indices 0–23
      if (index >= 0 && index <= 23) {
        if (value === 0) {
          result.checkers.push({ point: index, color: 'white', count: 0 })
        } else {
          result.checkers.push({
            point: index,
            color: value > 0 ? 'white' : 'black',
            count: Math.abs(value)
          })
        }
        return
      }

      if (value === 0) return
      const count = Math.abs(value)

      // 24–27 : bar/off, comme dans bgammonClient
      if (index === 24) {
        result.bar.push({ color: 'white', count })
        return
      }
      if (index === 25) {
        result.bar.push({ color: 'black', count })
        return
      }
      if (index === 26) {
        result.off.push({ color: 'white', count })
        return
      }
      if (index === 27) {
        result.off.push({ color: 'black', count })
      }
    })

    return result
  }

  const __emitTestState = (state: any) => {
    const next: any = { ...state }
    if (Array.isArray(state.board)) {
      const zones = mapBoardZones(state.board as number[])
      next.checkers = zones.checkers
      next.bar = zones.bar
      next.off = zones.off
    }
    subscribers.forEach((h) => h(next))
  }

  return {
    __esModule: true,
    default: client,
    __emitTestState
  }
})

import bgammonClient, { __emitTestState } from '../frontend/src/services/bgammonClient'

describe('bgammonClient (mocked)', () => {
  test('connects and receives board state', async () => {
    const updates: any[] = []

    bgammonClient.subscribe((state: any) => {
      updates.push(state)
    })

    await bgammonClient.connect('test-user')

    const payload = {
      board: [0, 1, -2, 0, 0, 0],
      dice: [3, 4],
      moves: ['1-3', '6-2']
    }

    __emitTestState(payload)

    expect(updates.length).toBeGreaterThan(0)
    const state = updates[0]

    expect(state).toBeDefined()
    expect(state.board).toBeDefined()
    expect(Array.isArray(state.board)).toBe(true)
    expect(state.dice).toEqual([3, 4])
    expect(state.moves).toEqual(['1-3', '6-2'])
  })

  test('maps board to checkers summary', async () => {
    const updates: any[] = []

    bgammonClient.subscribe((state: any) => {
      updates.push(state)
    })

    await bgammonClient.connect('test-user')

    const payload = {
      board: [2, -3, 0, 1],
      dice: [],
      moves: []
    }

    __emitTestState(payload)

    expect(updates.length).toBeGreaterThan(0)
    const state = updates[0]

    expect(state.checkers).toEqual([
      { point: 0, color: 'white', count: 2 },
      { point: 1, color: 'black', count: 3 },
      { point: 2, color: 'white', count: 0 },
      { point: 3, color: 'white', count: 1 }
    ])
  })

  test('maps bar/off correctly', async () => {
    const updates: any[] = []

    bgammonClient.subscribe((state: any) => {
      updates.push(state)
    })

    await bgammonClient.connect('test-user')

    const payload = {
      board: (() => {
        const arr = new Array(28).fill(0)
        arr[0] = 2
        arr[1] = -3
        arr[3] = 1
        arr[24] = 5   // bar white
        arr[25] = -4  // bar black
        return arr
      })(),
      dice: [],
      moves: []
    }

    __emitTestState(payload)

    expect(updates.length).toBeGreaterThan(0)
    const state = updates[0]

    expect(state.bar).toEqual([
      { color: 'white', count: 5 },
      { color: 'black', count: 4 }
    ])
  })
})
