import { promises as fs } from "node:fs"
import path from "node:path"

const root = process.cwd()
const incomingDir = path.join(root, "incoming-screenshots")
const productDir = path.join(root, "docs", "shiphero-reference", "01-product-creation")
const detailsDir = path.join(root, "docs", "shiphero-reference", "02-sku-details")

const productNames = [
  "01_products_inventory_list.png",
  "02_create_sku_form_top.png",
  "03_create_sku_form_bottom.png",
]

const detailNames = [
  "01_sku_details_overview_notes.png",
  "02_sku_details_uom_kits_bins_top.png",
  "03_sku_details_bins_case_barcodes_orders.png",
  "04_sku_details_purchase_orders_vendors_top.png",
  "05_sku_details_vendors_list_extended.png",
  "06_sku_details_stores_inventory_log_top.png",
  "07_sku_details_inventory_log_product_log.png",
]

const orderedTargetNames = [...productNames, ...detailNames]
const extPattern = /\.(png|jpg|jpeg|webp)$/i

async function main() {
  await fs.mkdir(productDir, { recursive: true })
  await fs.mkdir(detailsDir, { recursive: true })

  const entries = await fs.readdir(incomingDir, { withFileTypes: true })
  const imageFiles = entries
    .filter((entry) => entry.isFile() && extPattern.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))

  if (imageFiles.length === 0) {
    console.log("No image files found in incoming-screenshots.")
    return
  }

  if (imageFiles.length < orderedTargetNames.length) {
    console.log(`Found ${imageFiles.length} screenshots; expected ${orderedTargetNames.length}.`) 
    console.log("Add the missing screenshots and re-run this script.")
    return
  }

  for (let i = 0; i < orderedTargetNames.length; i += 1) {
    const sourceName = imageFiles[i]
    const targetName = orderedTargetNames[i]
    const sourcePath = path.join(incomingDir, sourceName)
    const targetPath = i < productNames.length ? path.join(productDir, targetName) : path.join(detailsDir, targetName)

    await fs.rm(targetPath, { force: true })
    await fs.rename(sourcePath, targetPath)
    console.log(`Moved ${sourceName} -> ${path.relative(root, targetPath)}`)
  }

  console.log("Screenshot organization complete.")
}

main().catch((error) => {
  console.error("Unable to organize screenshots.")
  console.error(error)
  process.exit(1)
})
