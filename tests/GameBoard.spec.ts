/** @jest-environment jsdom */

import { mount } from '@vue/test-utils'

// Config géométrique mockée pour les tests (miroir de frontend/src/config/boardGeometry.ts)
const MOCK_OFFSETS = {
  triangleWidth: 60,
  triangleHeight: 200,
  checkerRadius: 20,
  offsetX: 5,
  offsetY: -3
}

const MOCK_BOUNDS = {
  width: 800,
  height: 600,
  minX: 20,
  maxX: 780,
  minY: 40,
  maxY: 560
}

jest.mock('@/config/boardGeometry', () => ({
  __esModule: true,
  BOARD_OFFSETS: MOCK_OFFSETS,
  BOARD_BOUNDS: MOCK_BOUNDS
}))

// Mock config serveur pour éviter tout appel réseau réel dans les tests
jest.mock('@/config/server', () => ({
  __esModule: true,
  SERVER_URL: 'http://localhost:8080',
  LOGIN_ENDPOINT: '/login',
  GAME_ENDPOINT: '/game'
}))

// Mock du store Pinia utilisé par GameBoard.vue
jest.mock('@/stores/game', () => ({
  __esModule: true,
  useGameStore: () => ({
    currentGame: {
      whitePlayer: { username: 'WhiteUser', elo: 1500 },
      blackPlayer: { username: 'BlackUser', elo: 1500 }
    }
  })
}))

// bgammonClient mocké pour intercepter subscribe/connect
const mockSubscribe = jest.fn()

jest.mock('@/services/bgammonClient', () => ({
  __esModule: true,
  default: {
    connect: jest.fn().mockResolvedValue(undefined),
    subscribe: mockSubscribe,
    unsubscribe: jest.fn(),
    roll: jest.fn(),
    move: jest.fn(),
    confirmOk: jest.fn()
  }
}))

// Import après les mocks pour que GameBoard utilise les versions mockées
import GameBoard from '../frontend/src/components/GameBoard.vue'

// On stub les sous-composants pour simplifier le test
const globalStubs = {
  Dice: true,
  Checker: true,
  DoublingCube: true
}

describe('GameBoard - bgammon cube and score display', () => {
  test('renders cube and scores from bgammonState', async () => {
    const wrapper = mount(GameBoard, {
      global: {
        stubs: globalStubs
      }
    })

    // Le plateau premium doit être présent
    const boardImg = wrapper.find('.premium-board-bg')
    expect(boardImg.exists()).toBe(true)

    // Attendre la fin de l'onMounted async (connect + subscribe)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(mockSubscribe).toHaveBeenCalled()
    const handler = mockSubscribe.mock.calls[0][0]

    // Simule un état bgammon entrant via le handler
    handler({
      board: [],
      dice: [3, 4],
      moves: [],
      checkers: [
        { point: 1, color: 'white', count: 2 },
        { point: 6, color: 'black', count: 1 }
      ],
      scoreUser: 5,
      scoreOpponent: 2,
      cubeValue: 8,
      cubeOwner: 'opponent',
      bar: [],
      off: []
    })

    await wrapper.vm.$nextTick()

    // Vérifier que les pions sont positionnés conformément à bgammonState.checkers
    const whiteCheckerEl = wrapper.find('.checker-piece.checker-white[data-point="1"]')
    const blackCheckerEl = wrapper.find('.checker-piece.checker-black[data-point="6"]')
    expect(whiteCheckerEl.exists()).toBe(true)
    expect(blackCheckerEl.exists()).toBe(true)

    const whiteEl = whiteCheckerEl.element as HTMLElement
    const whiteLeft = parseFloat(whiteEl.style.left || '0')
    const whiteTop = parseFloat(whiteEl.style.top || '0')

    // Les pions doivent rester dans les bornes du plateau
    expect(whiteLeft).toBeGreaterThanOrEqual(MOCK_BOUNDS.minX)
    expect(whiteLeft).toBeLessThanOrEqual(MOCK_BOUNDS.maxX)
    expect(whiteTop).toBeGreaterThanOrEqual(MOCK_BOUNDS.minY)
    expect(whiteTop).toBeLessThanOrEqual(MOCK_BOUNDS.maxY)

    const text = wrapper.text()

    // Vérifier que les valeurs numériques et le propriétaire du cube sont bien rendus
    expect(text).toContain('5')
    expect(text).toContain('2')
    expect(text).toContain('8')
    expect(text).toContain('Adversaire')

    // Vérifier que le nombre de pions rendus correspond au mock (2 blancs + 1 noir)
    const allCheckers = wrapper.findAll('.checker-piece')
    expect(allCheckers.length).toBe(3)
  })
})
