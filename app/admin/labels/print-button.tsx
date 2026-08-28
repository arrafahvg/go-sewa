'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden rounded-full bg-[#173b3b] px-5 py-2.5 text-sm font-bold text-white"
    >
      Print
    </button>
  )
}