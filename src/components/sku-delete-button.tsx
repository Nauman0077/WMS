"use client"

import { useRouter } from "next/navigation"

interface SkuDeleteButtonProps {
  skuId: string
}

export function SkuDeleteButton({ skuId }: SkuDeleteButtonProps) {
  const router = useRouter()

  async function handleDelete() {
    const confirmed = window.confirm("Delete this SKU? This cannot be undone.")
    if (!confirmed) {
      return
    }

    const response = await fetch(`/api/skus/${skuId}`, { method: "DELETE" })
    const data = await response.json()
    if (!response.ok) {
      const details = data?.errors ? Object.values(data.errors).join(" ") : data?.message
      window.alert(details || "Unable to delete SKU.")
      return
    }

    router.push("/products")
    router.refresh()
  }

  return (
    <button className="danger-button" type="button" onClick={() => void handleDelete()}>
      Delete SKU
    </button>
  )
}
