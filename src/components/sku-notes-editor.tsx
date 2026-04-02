"use client"

import { useState } from "react"

interface SkuNotesEditorProps {
  skuId: string
  initialNotes: {
    product: string
    packer: string
    returnNote: string
  }
}

export function SkuNotesEditor({ skuId, initialNotes }: SkuNotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [statusText, setStatusText] = useState("")

  async function updateNote(key: "product" | "packer" | "returnNote") {
    setStatusText("Saving...")

    const response = await fetch(`/api/skus/${skuId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notes: {
          [key]: notes[key],
        },
      }),
    })

    if (!response.ok) {
      setStatusText("Unable to update note.")
      return
    }

    setStatusText("Saved.")
  }

  return (
    <>
      <section className="panel spaced-panel">
        <div className="panel-title">Product Note</div>
        <textarea
          className="note-area"
          value={notes.product}
          onChange={(event) => setNotes((prev) => ({ ...prev, product: event.target.value }))}
        />
        <div className="right-action">
          <button className="secondary-button" type="button" onClick={() => updateNote("product")}>
            Update
          </button>
        </div>
      </section>

      <section className="panel spaced-panel">
        <div className="panel-title">Product Packer Note</div>
        <textarea
          className="note-area"
          value={notes.packer}
          onChange={(event) => setNotes((prev) => ({ ...prev, packer: event.target.value }))}
        />
        <div className="right-action">
          <button className="secondary-button" type="button" onClick={() => updateNote("packer")}>
            Update
          </button>
        </div>
      </section>

      <section className="panel spaced-panel">
        <div className="panel-title">Product Return Note</div>
        <textarea
          className="note-area"
          value={notes.returnNote}
          onChange={(event) => setNotes((prev) => ({ ...prev, returnNote: event.target.value }))}
        />
        <div className="right-action">
          <button className="secondary-button" type="button" onClick={() => updateNote("returnNote")}>
            Update
          </button>
        </div>
      </section>

      {statusText ? <p className="status-note">{statusText}</p> : null}
    </>
  )
}
