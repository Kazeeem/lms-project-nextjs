"use client"

import PaymentSuccessContent from "@/components/PaymentSuccessContent";
import { Suspense } from "react"

const PaymentSuccessfulPage = () => {
  return (
    <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] px-4">
            <div className="w-full max-w-[580px] bg-white p-12 rounded-2xl shadow-lg text-center">
                <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-gray-600 text-lg">Loading...</p>
            </div>
        </div>
    }>
        <PaymentSuccessContent />
    </Suspense>
  )
}
export default PaymentSuccessfulPage