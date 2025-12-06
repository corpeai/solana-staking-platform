// lib/jupiter-swap.ts - Ultra API with Phantom warning fix

import { 
  Connection, 
  PublicKey, 
  VersionedTransaction,
  TransactionMessage,
  ComputeBudgetProgram,
  AddressLookupTableAccount,
} from "@solana/web3.js";

const REFERRAL_ACCOUNT = process.env.NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT || "";
const REFERRAL_FEE_BPS = parseInt(process.env.NEXT_PUBLIC_JUPITER_REFERRAL_FEE || "50");

interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: any;
  priceImpactPct: string;
  routePlan: any[];
}

export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 100,
  platformFeeBps?: number,
  treasuryWallet?: string
): Promise<JupiterQuoteResponse | null> {
  try {
    console.log('🪐 Jupiter Quote Request:', {
      inputMint,
      outputMint,
      amount,
      slippageBps,
    });

    const quoteParams = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps: slippageBps.toString(),
    });

    const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote?${quoteParams.toString()}`;
    
    let quoteResponse = await fetch(quoteUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!quoteResponse.ok) {
      const quoteUrlPro = `https://api.jup.ag/swap/v1/quote?${quoteParams.toString()}`;
      quoteResponse = await fetch(quoteUrlPro, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
    }

    if (!quoteResponse.ok) {
      console.error('❌ Quote failed:', quoteResponse.status);
      return null;
    }

    const quoteData = await quoteResponse.json();
    
    console.log('✅ Quote received:', {
      inputAmount: quoteData.inAmount,
      outputAmount: quoteData.outAmount,
      priceImpact: quoteData.priceImpactPct,
    });

    return {
      inputMint: quoteData.inputMint,
      inAmount: quoteData.inAmount,
      outputMint: quoteData.outputMint,
      outAmount: quoteData.outAmount,
      otherAmountThreshold: quoteData.otherAmountThreshold,
      swapMode: quoteData.swapMode,
      slippageBps: quoteData.slippageBps,
      platformFee: REFERRAL_ACCOUNT ? { feeBps: REFERRAL_FEE_BPS } : null,
      priceImpactPct: quoteData.priceImpactPct,
      routePlan: quoteData.routePlan || [],
    };

  } catch (error) {
    console.error("❌ Jupiter quote error:", error);
    return null;
  }
}

export async function executeJupiterSwap(
  connection: Connection,
  userPublicKey: PublicKey,
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 100,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
  platformFeeBps?: number,
  treasuryWallet?: string
): Promise<string> {
  try {
    console.log('🔄 Jupiter Ultra Swap:', {
      inputMint,
      outputMint,
      amount,
      slippageBps,
      userWallet: userPublicKey.toString(),
    });

    // Step 1: Get order from Ultra API
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: amount.toString(),
      taker: userPublicKey.toString(),
      slippageBps: slippageBps.toString(),
    });

    if (REFERRAL_ACCOUNT) {
      params.append('referralAccount', REFERRAL_ACCOUNT);
      params.append('referralFee', REFERRAL_FEE_BPS.toString());
      console.log('💰 Referral:', REFERRAL_ACCOUNT);
    }

    const orderUrl = `https://lite-api.jup.ag/ultra/v1/order?${params.toString()}`;
    
    console.log('📡 Fetching Ultra order...');
    const orderResponse = await fetch(orderUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('❌ Order failed:', orderResponse.status, errorText);
      throw new Error(`Failed to get order: ${errorText}`);
    }

    const orderData = await orderResponse.json();
    
    if (orderData.error) {
      console.error('❌ Jupiter error:', orderData.error);
      throw new Error(orderData.error);
    }
    
    if (!orderData.transaction) {
      throw new Error('No transaction returned from Ultra API');
    }

    console.log('✅ Order received:', {
      requestId: orderData.requestId,
      feeMint: orderData.feeMint,
      feeBps: orderData.feeBps,
    });

    // Step 2: Deserialize the transaction
    const transactionBuf = Buffer.from(orderData.transaction, 'base64');
    const originalTx = VersionedTransaction.deserialize(transactionBuf);

    // Step 3: Get address lookup tables
    const addressLookupTableAccounts: AddressLookupTableAccount[] = [];
    
    if (originalTx.message.addressTableLookups.length > 0) {
      const lookupTableAddresses = originalTx.message.addressTableLookups.map(
        lookup => lookup.accountKey
      );
      
      const lookupTableAccounts = await Promise.all(
        lookupTableAddresses.map(async (address) => {
          const account = await connection.getAddressLookupTable(address);
          return account.value;
        })
      );
      
      for (const account of lookupTableAccounts) {
        if (account) {
          addressLookupTableAccounts.push(account);
        }
      }
    }

    // Step 4: Decompile the message to get instructions
    const decompiledMessage = TransactionMessage.decompile(
      originalTx.message,
      { addressLookupTableAccounts }
    );

    // Step 5: Check if compute budget instructions already exist
    const computeBudgetProgramId = ComputeBudgetProgram.programId.toString();
    const hasComputeBudget = decompiledMessage.instructions.some(
      ix => ix.programId.toString() === computeBudgetProgramId
    );

    // Step 6: Build new instructions with compute budget at front
    let newInstructions = [...decompiledMessage.instructions];
    
    if (!hasComputeBudget) {
      console.log('➕ Adding compute budget instructions...');
      
      const computeUnitLimit = ComputeBudgetProgram.setComputeUnitLimit({
        units: 400000,
      });
      
      const computeUnitPrice = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 50000,
      });
      
      // Prepend compute budget instructions
      newInstructions = [computeUnitLimit, computeUnitPrice, ...newInstructions];
    } else {
      console.log('✅ Compute budget already present');
    }

    // Step 7: Get fresh blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

    // Step 8: Create new transaction message with feePayer explicitly first
    const newMessage = new TransactionMessage({
      payerKey: userPublicKey,
      recentBlockhash: blockhash,
      instructions: newInstructions,
    });

    // Step 9: Compile to versioned transaction
    const newTransaction = new VersionedTransaction(
      newMessage.compileToV0Message(addressLookupTableAccounts)
    );

    console.log('✍️ Requesting signature...');
    
    // Step 10: Sign
    const signedTransaction = await signTransaction(newTransaction);
    const signedTransactionBase64 = Buffer.from(signedTransaction.serialize()).toString('base64');

    // Step 11: Execute via Ultra API
    console.log('📤 Executing via Ultra...');
    const executeResponse = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        signedTransaction: signedTransactionBase64,
        requestId: orderData.requestId,
      }),
    });

    if (!executeResponse.ok) {
      const errorText = await executeResponse.text();
      console.error('❌ Execute failed:', executeResponse.status, errorText);
      
      // Fallback: Send directly to RPC
      console.log('🔄 Trying direct RPC submission...');
      const rawTransaction = signedTransaction.serialize();
      
      const txid = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      });

      console.log('✅ Transaction sent via RPC:', txid);
      
      await connection.confirmTransaction({
        signature: txid,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return txid;
    }

    const executeData = await executeResponse.json();

    if (executeData.status === "Success" && executeData.signature) {
      console.log('✅ Swap successful:', executeData.signature);
      return executeData.signature;
    } else if (executeData.signature) {
      console.log('⚠️ Swap completed with signature:', executeData.signature);
      return executeData.signature;
    } else {
      console.error('❌ Swap failed:', executeData);
      throw new Error(executeData.error || 'Swap execution failed');
    }

  } catch (error: any) {
    console.error("❌ Jupiter swap error:", error);
    
    if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
      throw new Error('User rejected the transaction');
    }
    
    throw error;
  }
}