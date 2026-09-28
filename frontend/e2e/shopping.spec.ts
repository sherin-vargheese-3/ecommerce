import { expect, test, type Page } from '@playwright/test'

/**
 * A customer buys a product through the UI, then an admin confirms and cancels the order.
 * Cancelling returns the stock, so running this against a dev database leaves inventory unchanged
 * (it does leave one e2e customer and one cancelled order behind).
 */
test.describe.serial('shopping journey', () => {
  const email = `e2e-${Date.now()}@example.com`
  const password = 'password123'
  const productName = 'USB-C Hub'
  let orderNumber = ''

  async function stockOf(page: Page) {
    await page.goto('/')
    await page.getByRole('searchbox', { name: 'Search products' }).fill(productName)
    await page.getByRole('button', { name: 'Search' }).click()
    await page.getByRole('link', { name: productName }).click()
    const stockText = await page.getByText(/in stock$/).textContent()
    return Number(stockText!.match(/\d+/)![0])
  }

  test('customer registers, adds to cart and places an order', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Name').fill('E2E Customer')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Register' }).click()
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()
    await expect(page.getByText('E2E Customer')).toBeVisible()

    const stockBefore = await stockOf(page)
    await page.getByRole('button', { name: 'Increase quantity' }).click()
    await page.getByRole('button', { name: 'Add to cart' }).click()
    await expect(page.getByRole('status')).toHaveText('Added 2 to your cart.')
    await expect(page.getByLabel('2 items')).toBeVisible()

    await page.getByRole('link', { name: /^Cart/ }).click()
    await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible()
    await expect(page.getByRole('link', { name: productName })).toBeVisible()
    await page.getByRole('button', { name: 'Place order' }).click()

    await expect(page.getByRole('status')).toContainText('Your order has been placed')
    const heading = await page.getByRole('heading', { name: /^Order #\d+$/ }).textContent()
    orderNumber = heading!.replace('Order ', '')
    await expect(page.getByText('Pending')).toBeVisible()

    await page.getByRole('link', { name: 'Orders', exact: true }).click()
    await expect(page.getByText(`Order ${orderNumber}`)).toBeVisible()
    expect(await stockOf(page)).toBe(stockBefore - 2)
  })

  test('admin confirms, then cancels the order and stock is returned', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('admin@shop.local')
    await page.getByLabel('Password').fill('admin12345')
    await page.getByRole('button', { name: 'Log in' }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: orderNumber })).toBeVisible()

    await page.getByRole('link', { name: 'Manage orders' }).click()
    await page.getByRole('combobox', { name: 'Filter by status' }).selectOption('PENDING')
    await page.getByRole('link', { name: orderNumber, exact: true }).click()
    await expect(page.getByText(`E2E Customer (${email})`)).toBeVisible()

    await page.getByRole('button', { name: 'Confirm order' }).click()
    await expect(page.getByText('Confirmed', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark as shipped' })).toBeVisible()

    const stockBefore = await (async () => {
      const url = page.url()
      const stock = await stockOf(page)
      await page.goto(url)
      return stock
    })()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Cancel order' }).click()
    await expect(page.getByText('Cancelled', { exact: true })).toBeVisible()
    await expect(page.getByText('This order is cancelled; no further changes.')).toBeVisible()
    expect(await stockOf(page)).toBe(stockBefore + 2)
  })

  test('customers are kept out of admin pages', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Log in' }).click()
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()

    await page.goto('/admin/orders')
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Manage orders' })).toHaveCount(0)
  })
})
