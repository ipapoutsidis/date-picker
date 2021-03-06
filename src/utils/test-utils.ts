import { newE2EPage, E2EPage } from "@stencil/core/testing"
import { Page as PuppeteerPage } from "puppeteer"

export type DuetE2EPage = E2EPage & Pick<PuppeteerPage, "screenshot" | "viewport">

type DuetE2EPageOptions = { html: string; viewportWidth: number }

export async function createPage(optionsOrHtml?: string | DuetE2EPageOptions) {
  const options: DuetE2EPageOptions =
    typeof optionsOrHtml === "string" ? { html: optionsOrHtml, viewportWidth: 600 } : optionsOrHtml

  const page = (await newE2EPage()) as DuetE2EPage
  const viewport = Object.assign({ height: page.viewport().height }, { width: options.viewportWidth })
  await page.setViewport(viewport)
  await page.setContent(options.html, { waitUntil: "networkidle0" })
  await page.evaluateHandle(() => (document as any).fonts.ready)

  // monkey patch screenshot function to add some extra features
  const screenshot = page.screenshot
  page.screenshot = async function() {
    // get the element's height, and set viewport to that height
    // this enables us to get full page, clipped screenshots
    const htmlElement = await page.$("html")
    const { width, height } = await htmlElement.boundingBox()
    await page.setViewport({ width: page.viewport().width, height: Math.round(height) })

    return screenshot.call(page, {
      clip: {
        x: 0,
        y: 0,
        width: Math.round(width),
        height: Math.round(height),
      },
    })
  }

  return page
}
