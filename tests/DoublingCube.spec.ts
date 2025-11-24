/** @jest-environment jsdom */

import { mount } from '@vue/test-utils'
import DoublingCube from '../frontend/src/components/DoublingCube.vue'

describe('DoublingCube - bgammon cube display', () => {
  const baseProps = {
    currentValue: 1,
    canDouble: false,
    isPlayerTurn: false,
    playerColor: 'white' as const,
    gameMode: 'AI_VS_PLAYER' as const
  }

  test('cubeValue=2, cubeOwner="user" -> Cube: 2, Propriétaire: Vous', () => {
    const wrapper = mount(DoublingCube, {
      props: {
        ...baseProps,
        cubeValue: 2,
        cubeOwner: 'user'
      }
    })

    const status = wrapper.find('.bgammon-cube-status')
    expect(status.exists()).toBe(true)
    const text = status.text()

    expect(text).toContain('Cube:')
    expect(text).toContain('2')
    expect(text).toContain('Propriétaire:')
    expect(text).toContain('Vous')
  })

  test('cubeValue=4, cubeOwner="opponent" -> Cube: 4, Propriétaire: Adversaire', () => {
    const wrapper = mount(DoublingCube, {
      props: {
        ...baseProps,
        cubeValue: 4,
        cubeOwner: 'opponent'
      }
    })

    const status = wrapper.find('.bgammon-cube-status')
    expect(status.exists()).toBe(true)
    const text = status.text()

    expect(text).toContain('Cube:')
    expect(text).toContain('4')
    expect(text).toContain('Propriétaire:')
    expect(text).toContain('Adversaire')
  })

  test('cubeValue=1, cubeOwner=null -> Cube: 1, Propriétaire: Centre', () => {
    const wrapper = mount(DoublingCube, {
      props: {
        ...baseProps,
        cubeValue: 1,
        cubeOwner: null
      }
    })

    const status = wrapper.find('.bgammon-cube-status')
    expect(status.exists()).toBe(true)
    const text = status.text()

    expect(text).toContain('Cube:')
    expect(text).toContain('1')
    expect(text).toContain('Propriétaire:')
    expect(text).toContain('Centre')
  })
})
