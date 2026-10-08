/**
 * Runs the MSW handlers outside the browser and calls them the way the app
 * does, so a path that does not match shows up here rather than as a 404 in
 * someone's face.
 */
import { setupServer } from 'msw/node'
import { handlers } from '../src/mocks/handlers'

const server = setupServer(...handlers)
server.listen({ onUnhandledRequest: 'error' })

const BASE = 'http://127.0.0.1:5180/api/v1'

async function call(method: string, path: string, body?: unknown, token?: string) {
  try {
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const payload = await response.json().catch(() => null)
    console.log(`${method} ${path} -> ${response.status}`)
    return { status: response.status, payload }
  } catch (error) {
    console.log(`${method} ${path} -> NOT INTERCEPTED (${(error as Error).message})`)
    return { status: 0, payload: null }
  }
}

const results: string[] = []

const register = await call('POST', '/auth/register', {
  email: 'new@example.com',
  password: 'correct horse battery',
  firstName: 'New',
  lastName: 'Person',
  phoneNumber: '+2348000000001',
})
results.push(`register ${register.status}`)

const login = await call('POST', '/auth/login', {
  email: 'ada@example.com',
  password: 'correct horse battery',
})
const token = (login.payload as { data?: { accessToken?: string } } | null)?.data?.accessToken
results.push(`login ${login.status}`)

results.push(`me ${(await call('GET', '/users/me', undefined, token)).status}`)
results.push(`catalogue ${(await call('GET', '/visa-catalogue')).status}`)
results.push(`offering ${(await call('GET', '/visa-catalogue/GB_VISITOR_STD')).status}`)
results.push(`clients ${(await call('GET', '/clients?page=0&size=1', undefined, token)).status}`)
results.push(`applications ${(await call('GET', '/applications?page=0&size=20', undefined, token)).status}`)

console.log('\nSUMMARY:', results.join(' | '))
server.close()
