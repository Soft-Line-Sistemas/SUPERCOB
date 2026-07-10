import { expect, test } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await expect(page).toHaveURL(/\/login/)

  await page.getByPlaceholder('exemplo@mrcobrancas.com.br').fill('admin@mrcobrancas.com.br')
  await page.getByPlaceholder('••••••••').fill('admin123')
  await page.getByRole('button', { name: 'Acessar Plataforma' }).click()

  await expect(page).toHaveURL(/\/dashboard/)
}

test('Fluxo de parcelamento na nova cobranca e no novo cliente', async ({ page }) => {
  test.setTimeout(120000)
  await login(page)

  await page.goto('/emprestimos')
  await expect(page).toHaveURL(/\/emprestimos/)
  await page.getByRole('button', { name: 'Nova Cobrança' }).click()
  await expect(page.getByText('Associe a cobrança ao cliente e registre valores.')).toBeVisible()
  const chargeForm = page.locator('form').last()

  await page.getByLabel('Parcelar valor').check()
  await expect(page.getByText('Modalidade')).toBeVisible()
  await expect(page.getByText('Receita esperada (%)')).toBeVisible()
  await expect(page.getByText('Parcela atual')).toBeVisible()

  await chargeForm.getByPlaceholder('R$ 0,00').fill('1000')
  await chargeForm.getByPlaceholder('0').first().fill('10')
  await chargeForm.getByPlaceholder('Ex: 20').fill('10')
  await chargeForm.getByRole('combobox').nth(2).selectOption('3')

  const descontoCheckbox = page.getByLabel('Descontar as parcelas ja pagas?')
  await expect(descontoCheckbox).toBeEnabled()
  await descontoCheckbox.check()
  await expect(page.getByText(/Descontado as parcelas ja pagas valor:/)).toBeVisible()

  await page.getByRole('button', { name: 'Cancelar' }).click()

  await page.goto('/clientes')
  await expect(page).toHaveURL(/\/clientes/)
  await page.getByRole('button', { name: 'Novo Cliente' }).click()
  await expect(page.getByRole('heading', { name: 'Novo Cliente' })).toBeVisible()
  const clientForm = page.locator('form').last()

  await page.getByRole('button', { name: 'Cobrança' }).click()
  await expect(page.getByText('Cobrança inicial')).toBeVisible()

  await page.getByRole('button', { name: 'Desativado' }).click()
  await page.getByLabel('Parcelar valor').check()
  await expect(page.getByText('Modalidade')).toBeVisible()
  await expect(page.getByText('Receita esperada (%)')).toBeVisible()
  await expect(page.getByText('Parcela atual')).toBeVisible()

  await clientForm.getByPlaceholder('0,00').fill('1000')
  await clientForm.getByPlaceholder('0').first().fill('10')
  await clientForm.getByPlaceholder('Auto').fill('12')
  await clientForm.getByRole('combobox').nth(2).selectOption('4')

  const descontoClienteCheckbox = page.getByLabel('Descontar as parcelas ja pagas?')
  await expect(descontoClienteCheckbox).toBeEnabled()
  await descontoClienteCheckbox.check()
  await expect(page.getByText(/Descontado as parcelas ja pagas valor:/)).toBeVisible()
})
