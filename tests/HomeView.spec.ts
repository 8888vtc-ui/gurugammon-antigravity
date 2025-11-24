/** @jest-environment jsdom */

import { mount } from '@vue/test-utils'
import HomeView from '../frontend/src/views/HomeView.vue'

// Mock du routeur applicatif pour intercepter router.push('/game')
jest.mock('@/router', () => ({
  __esModule: true,
  default: {
    push: jest.fn()
  }
}))

// Importer le routeur mocké pour accéder à la fonction push
import router from '@/router'

describe('HomeView - local login bypass', () => {
  test('simulates login in local dev and navigates to /game', async () => {
    const wrapper = mount(HomeView)

    // Remplir email/mot de passe pour éviter le early return
    await wrapper.find('#email').setValue('test@example.com')
    await wrapper.find('#password').setValue('password')

    await wrapper.find('form').trigger('submit.prevent')

    await wrapper.vm.$nextTick()

    // Vérifier que le token de bypass est bien posé
    expect(localStorage.getItem('authToken')).toBe('local-dev-bypass')

    // Vérifier la navigation vers /game via router.push
    expect((router as any).push).toHaveBeenCalledWith('/game')
  })
})
