// app/swap/[mint]/page.tsx
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SwapMintRedirect() {
  const params = useParams();
  const router = useRouter();
  const mint = params.mint as string;

  useEffect(() => {
    // Redirect to main swap page with query param
    router.replace(`/swap?outputMint=${mint}`);
  }, [mint, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div 
        className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: '#fb57ff', borderTopColor: 'transparent' }}
      />
    </div>
  );
}