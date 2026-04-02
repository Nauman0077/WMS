"use client"

import { useRouter } from "next/navigation"

interface PurchaseOrderDeleteButtonProps {
  poId: string
}

export function PurchaseOrderDeleteButton({ poId }: PurchaseOrderDeleteButtonProps) {
  const router = useRouter()

  async function handleDelete() {
    const confirmed = window.confirm("Delete this purchase order? This action cannot be undone.")
    if (!confirmed) {
      return
    }

    const response = await fetch(`/api/purchase-orders/${poId}`, { method: "DELETE" })
    if (!response.ok) {
      window.alert("Unable to delete purchase order.")
      return
    }

    router.push("/purchase-orders")
    router.refresh()
  }

  return (
    <button className="danger-button" type="button" onClick={() => void handleDelete()}>
      Delete PO
    </button>
  )
}
