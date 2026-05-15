import { expect, test } from '@playwright/test'

test('Fluxo visual do dashboard WhatsApp: login, menu e sub-abas', async ({ page }) => {
  test.setTimeout(120000)
  await page.goto('/login')
  await expect(page).toHaveURL(/\/login/)

  await page.getByPlaceholder('exemplo@mrcobrancas.com.br').fill('admin@mrcobrancas.com.br')
  await page.getByPlaceholder('••••••••').fill('admin123')
  await page.getByRole('button', { name: 'Acessar Plataforma' }).click()

  await expect(page).toHaveURL(/\/dashboard/)

  await page.getByRole('link', { name: 'WhatsApp' }).first().click()
  await expect(page).toHaveURL(/\/dashboard\/whatsapp/)
  await expect(page.getByRole('heading', { name: 'Automação WhatsApp' })).toBeVisible()

  const main = page.locator('main')

  await page.getByRole('button', { name: 'Conexão' }).click()
  await expect(main.getByRole('heading', { name: 'Conexão WhatsApp' })).toBeVisible()
  await expect(main.getByRole('button', { name: 'Novo QR' })).toBeVisible()
  await expect(main.getByRole('button', { name: 'Desconectar' })).toBeVisible()

  await page.getByRole('button', { name: 'Visão Geral' }).click()
  await expect(main.getByText('Intervalo Anti-Spam')).toBeVisible()
  await expect(main.getByRole('button', { name: 'Enviar agora' }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Clientes' }).click()
  await expect(main.getByPlaceholder('Buscar por nome ou WhatsApp')).toBeVisible()

  await page.getByRole('button', { name: 'Configuração' }).click()
  await expect(main.getByRole('button', { name: 'Salvar configuração' })).toBeVisible()
})
