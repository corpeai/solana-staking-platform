"use client";

import { useState, useEffect, useMemo } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, ComputeBudgetProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import {
  Send,
  Upload,
  Loader2,
  Wallet,
  ChevronDown,
  X,
  AlertCircle,
  CheckCircle2,
  FileText,
  Users,
  Coins,
} from "lucide-react";

interface TokenAccount {
  mint: string;
  balance: number;
  decimals: number;
  symbol: string;
  name: string;
  logoURI: string | null;
  programId: PublicKey;
}

interface Recipient {
  wallet: string;
  amount: number;
  valid: boolean;
  error?: string;
}

interface AirdropResult {
  wallet: string;
  amount: number;
  status: "success" | "failed";
  signature?: string;
  error?: string;
}

// Batch sizes based on whether ATAs need creation
const TRANSFERS_WITH_ATA_CREATION = 8;  // When creating new token accounts
const TRANSFERS_WITHOUT_ATA = 18;        // When ATAs already exist

export default function AirdropPage() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [tokens, setTokens] = useState<TokenAccount[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenAccount | null>(null);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);

  const [inputMode, setInputMode] = useState<"manual" | "csv">("manual");
  const [manualInput, setManualInput] = useState("");
  const [amountPerWallet, setAmountPerWallet] = useState("");
  const [useFixedAmount, setUseFixedAmount] = useState(true);

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [statusMessage, setStatusMessage] = useState("");
  const [results, setResults] = useState<AirdropResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Fetch user's tokens
  const fetchTokens = async () => {
    if (!publicKey) return;

    setLoadingTokens(true);
    try {
      const splAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      const token2022Accounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_2022_PROGRAM_ID }
      );

      const allAccounts = [
        ...splAccounts.value.map((acc) => ({ ...acc, programId: TOKEN_PROGRAM_ID })),
        ...token2022Accounts.value.map((acc) => ({ ...acc, programId: TOKEN_2022_PROGRAM_ID })),
      ];

      const tokenList: TokenAccount[] = [];

      for (const account of allAccounts) {
        const parsed = account.account.data.parsed.info;
        const balance = parsed.tokenAmount.uiAmount || 0;

        if (balance === 0) continue; // Skip empty accounts

        const mint = parsed.mint;
        let symbol = mint.slice(0, 4) + "..." + mint.slice(-4);
        let name = "Unknown Token";
        let logoURI: string | null = null;

        try {
          const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
          if (res.ok) {
            const data = await res.json();
            const bestPair = data.pairs?.sort(
              (a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
            )[0];

            if (bestPair?.baseToken) {
              symbol = bestPair.baseToken.symbol || symbol;
              name = bestPair.baseToken.name || name;
              logoURI = bestPair.info?.imageUrl || null;
            }
          }
        } catch {
          // Silent fail
        }

        tokenList.push({
          mint,
          balance,
          decimals: parsed.tokenAmount.decimals,
          symbol,
          name,
          logoURI,
          programId: account.programId,
        });
      }

      // Sort by balance
      tokenList.sort((a, b) => b.balance - a.balance);
      setTokens(tokenList);
    } catch (error) {
      console.error("Error fetching tokens:", error);
    } finally {
      setLoadingTokens(false);
    }
  };

  useEffect(() => {
    if (publicKey) {
      fetchTokens();
    }
  }, [publicKey]);

  // Parse recipients from manual input
  useEffect(() => {
    if (inputMode !== "manual") return;

    const lines = manualInput
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsed: Recipient[] = lines.map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      const wallet = parts[0];
      let amount = useFixedAmount ? parseFloat(amountPerWallet) || 0 : parseFloat(parts[1]) || 0;

      let valid = true;
      let error: string | undefined;

      try {
        new PublicKey(wallet);
      } catch {
        valid = false;
        error = "Invalid wallet address";
      }

      if (amount <= 0) {
        valid = false;
        error = error || "Invalid amount";
      }

      return { wallet, amount, valid, error };
    });

    setRecipients(parsed);
  }, [manualInput, amountPerWallet, useFixedAmount, inputMode]);

  // Handle CSV upload
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      // Skip header if present
      const dataLines = lines[0]?.toLowerCase().includes("wallet") ? lines.slice(1) : lines;

      const parsed: Recipient[] = dataLines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        const wallet = parts[0];
        const amount = useFixedAmount ? parseFloat(amountPerWallet) || 0 : parseFloat(parts[1]) || 0;

        let valid = true;
        let error: string | undefined;

        try {
          new PublicKey(wallet);
        } catch {
          valid = false;
          error = "Invalid wallet address";
        }

        if (amount <= 0) {
          valid = false;
          error = error || "Invalid amount";
        }

        return { wallet, amount, valid, error };
      });

      setRecipients(parsed);
      setInputMode("csv");
    };
    reader.readAsText(file);
  };

  // Stats
  const stats = useMemo(() => {
    const validRecipients = recipients.filter((r) => r.valid);
    const totalAmount = validRecipients.reduce((sum, r) => sum + r.amount, 0);
    const invalidCount = recipients.length - validRecipients.length;

    return {
      total: recipients.length,
      valid: validRecipients.length,
      invalid: invalidCount,
      totalAmount,
      hasEnoughBalance: selectedToken ? totalAmount <= selectedToken.balance : false,
    };
  }, [recipients, selectedToken]);

  // Send airdrop
  const sendAirdrop = async () => {
    if (!publicKey || !sendTransaction || !selectedToken) return;

    const validRecipients = recipients.filter((r) => r.valid);
    if (validRecipients.length === 0) return;

    setSending(true);
    setProgress({ current: 0, total: validRecipients.length });
    setResults([]);
    setShowResults(false);

    const mintPubkey = new PublicKey(selectedToken.mint);
    const senderAta = getAssociatedTokenAddressSync(
      mintPubkey,
      publicKey,
      false,
      selectedToken.programId
    );

    // Pre-check which recipients need ATA creation
    setStatusMessage("Checking recipient token accounts...");
    
    const recipientsWithAta: Recipient[] = [];
    const recipientsNeedAta: Recipient[] = [];
    
    for (let i = 0; i < validRecipients.length; i++) {
      const recipient = validRecipients[i];
      try {
        const recipientPubkey = new PublicKey(recipient.wallet);
        const recipientAta = getAssociatedTokenAddressSync(
          mintPubkey,
          recipientPubkey,
          false,
          selectedToken.programId
        );
        
        try {
          await getAccount(connection, recipientAta, "confirmed", selectedToken.programId);
          recipientsWithAta.push(recipient);
        } catch {
          recipientsNeedAta.push(recipient);
        }
      } catch {
        recipientsNeedAta.push(recipient);
      }
      
      if (i % 20 === 0) {
        setStatusMessage(`Checking accounts... (${i + 1}/${validRecipients.length})`);
      }
    }

    // Create batches - larger batches for existing ATAs, smaller for new ATAs
    const batches: { recipients: Recipient[]; needsAta: boolean }[] = [];
    
    // Batch recipients that already have ATAs (larger batches)
    for (let i = 0; i < recipientsWithAta.length; i += TRANSFERS_WITHOUT_ATA) {
      batches.push({
        recipients: recipientsWithAta.slice(i, i + TRANSFERS_WITHOUT_ATA),
        needsAta: false,
      });
    }
    
    // Batch recipients that need ATA creation (smaller batches)
    for (let i = 0; i < recipientsNeedAta.length; i += TRANSFERS_WITH_ATA_CREATION) {
      batches.push({
        recipients: recipientsNeedAta.slice(i, i + TRANSFERS_WITH_ATA_CREATION),
        needsAta: true,
      });
    }

    const allResults: AirdropResult[] = [];
    let successCount = 0;

    setStatusMessage(`Processing ${batches.length} batch(es)... (${recipientsWithAta.length} existing ATAs, ${recipientsNeedAta.length} new ATAs)`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        setStatusMessage(`Processing batch ${i + 1}/${batches.length}${batch.needsAta ? " (creating ATAs)" : ""}...`);

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        const transaction = new Transaction();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        // Add compute budget
        transaction.add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: batch.needsAta ? 600000 : 400000 }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 })
        );

        for (const recipient of batch.recipients) {
          const recipientPubkey = new PublicKey(recipient.wallet);
          const recipientAta = getAssociatedTokenAddressSync(
            mintPubkey,
            recipientPubkey,
            false,
            selectedToken.programId
          );

          // Create ATA if needed
          if (batch.needsAta) {
            transaction.add(
              createAssociatedTokenAccountInstruction(
                publicKey,
                recipientAta,
                recipientPubkey,
                mintPubkey,
                selectedToken.programId
              )
            );
          }

          // Add transfer instruction
          const transferAmount = BigInt(
            Math.floor(recipient.amount * Math.pow(10, selectedToken.decimals))
          );

          transaction.add(
            createTransferInstruction(
              senderAta,
              recipientAta,
              publicKey,
              transferAmount,
              [],
              selectedToken.programId
            )
          );
        }

        setStatusMessage(`Approve batch ${i + 1}/${batches.length} in wallet...`);

        const signature = await sendTransaction(transaction, connection, {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        });

        setStatusMessage(`Confirming batch ${i + 1}/${batches.length}...`);

        await connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          "confirmed"
        );

        // Mark batch as successful
        for (const recipient of batch.recipients) {
          allResults.push({
            wallet: recipient.wallet,
            amount: recipient.amount,
            status: "success",
            signature,
          });
          successCount++;
        }

        setProgress({ current: successCount, total: validRecipients.length });
      } catch (err: any) {
        console.error(`Batch ${i + 1} failed:`, err);

        // Mark batch as failed
        for (const recipient of batch.recipients) {
          allResults.push({
            wallet: recipient.wallet,
            amount: recipient.amount,
            status: "failed",
            error: err.message || "Transaction failed",
          });
        }

        setProgress({ current: allResults.length, total: validRecipients.length });

        if (err.message?.includes("User rejected")) {
          setStatusMessage("Cancelled by user");
          break;
        }
      }
    }

    setResults(allResults);
    setShowResults(true);

    const successfulSends = allResults.filter((r) => r.status === "success").length;
    if (successfulSends > 0) {
      setStatusMessage(
        `✅ Sent ${selectedToken.symbol} to ${successfulSends}/${validRecipients.length} wallets!`
      );
      fetchTokens(); // Refresh balance
    } else {
      setStatusMessage("❌ Airdrop failed");
    }

    setSending(false);
  };

  // Clear all
  const clearAll = () => {
    setManualInput("");
    setRecipients([]);
    setResults([]);
    setShowResults(false);
    setAmountPerWallet("");
  };

  if (!publicKey) {
    return (
      <div className="max-w-4xl mx-auto pt-6">
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-white/[0.02] flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-10 h-10 text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Connect your wallet to send token airdrops</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pt-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fb57ff] to-purple-600 flex items-center justify-center">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Airdrop Tool</h1>
            <p className="text-gray-400 text-sm">Send tokens to multiple wallets in batches</p>
          </div>
        </div>
      </div>

      {/* Token Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">Select Token</label>
        <div className="relative">
          <button
            onClick={() => setShowTokenDropdown(!showTokenDropdown)}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-[#fb57ff]/30 transition-all"
          >
            {loadingTokens ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading tokens...
              </div>
            ) : selectedToken ? (
              <div className="flex items-center gap-3">
                {selectedToken.logoURI ? (
                  <img
                    src={selectedToken.logoURI}
                    alt={selectedToken.symbol}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-400">
                      {selectedToken.symbol.slice(0, 2)}
                    </span>
                  </div>
                )}
                <div className="text-left">
                  <p className="font-semibold text-white">{selectedToken.symbol}</p>
                  <p className="text-xs text-gray-500">
                    Balance: {selectedToken.balance.toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-gray-500">Choose a token to airdrop</span>
            )}
            <ChevronDown className="w-5 h-5 text-gray-500" />
          </button>

          {showTokenDropdown && (
            <div className="absolute z-50 w-full mt-2 rounded-xl bg-[#0a0a0f] border border-white/[0.1] shadow-xl max-h-64 overflow-y-auto">
              {tokens.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No tokens found</div>
              ) : (
                tokens.map((token) => (
                  <button
                    key={token.mint}
                    onClick={() => {
                      setSelectedToken(token);
                      setShowTokenDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.05] transition-colors"
                  >
                    {token.logoURI ? (
                      <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-400">
                          {token.symbol.slice(0, 2)}
                        </span>
                      </div>
                    )}
                    <div className="text-left flex-1">
                      <p className="font-medium text-white">{token.symbol}</p>
                      <p className="text-xs text-gray-500">{token.name}</p>
                    </div>
                    <p className="text-sm text-gray-400">{token.balance.toLocaleString()}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Amount Mode */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">Amount Mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => setUseFixedAmount(true)}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              useFixedAmount
                ? "bg-[#fb57ff]/10 border border-[#fb57ff] text-[#fb57ff]"
                : "bg-white/[0.02] border border-white/[0.05] text-gray-400 hover:border-white/[0.1]"
            }`}
          >
            Fixed Amount Per Wallet
          </button>
          <button
            onClick={() => setUseFixedAmount(false)}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              !useFixedAmount
                ? "bg-[#fb57ff]/10 border border-[#fb57ff] text-[#fb57ff]"
                : "bg-white/[0.02] border border-white/[0.05] text-gray-400 hover:border-white/[0.1]"
            }`}
          >
            Variable Amount (from CSV)
          </button>
        </div>
      </div>

      {/* Fixed Amount Input */}
      {useFixedAmount && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Amount per wallet {selectedToken && `(${selectedToken.symbol})`}
          </label>
          <input
            type="number"
            value={amountPerWallet}
            onChange={(e) => setAmountPerWallet(e.target.value)}
            placeholder="Enter amount"
            className="w-full p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] focus:border-[#fb57ff]/50 outline-none text-white placeholder-gray-500"
          />
        </div>
      )}

      {/* Input Mode Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setInputMode("manual")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            inputMode === "manual"
              ? "bg-[#fb57ff]/10 border border-[#fb57ff] text-[#fb57ff]"
              : "bg-white/[0.02] border border-white/[0.05] text-gray-400 hover:border-white/[0.1]"
          }`}
        >
          <FileText className="w-4 h-4" />
          Manual Entry
        </button>
        <label
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
            inputMode === "csv"
              ? "bg-[#fb57ff]/10 border border-[#fb57ff] text-[#fb57ff]"
              : "bg-white/[0.02] border border-white/[0.05] text-gray-400 hover:border-white/[0.1]"
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload CSV
          <input type="file" accept=".csv,.txt" onChange={handleCSVUpload} className="hidden" />
        </label>
        {recipients.length > 0 && (
          <button
            onClick={clearAll}
            className="ml-auto px-4 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-red-500/30 text-sm font-medium text-gray-400 hover:text-red-400 transition-all"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Manual Input */}
      {inputMode === "manual" && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Recipient Wallets {!useFixedAmount && "(wallet,amount)"}
          </label>
          <textarea
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder={
              useFixedAmount
                ? "Enter wallet addresses, one per line:\n\nWallet1Address\nWallet2Address\nWallet3Address"
                : "Enter wallet,amount pairs, one per line:\n\nWallet1Address,100\nWallet2Address,200\nWallet3Address,150"
            }
            rows={8}
            className="w-full p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] focus:border-[#fb57ff]/50 outline-none text-white placeholder-gray-500 font-mono text-sm resize-none"
          />
        </div>
      )}

      {/* CSV Format Helper */}
      {inputMode === "csv" && recipients.length === 0 && (
        <div className="mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <p className="text-sm text-gray-400 mb-2">CSV Format:</p>
          <code className="text-xs text-gray-500 font-mono">
            {useFixedAmount ? "wallet\nWallet1Address\nWallet2Address" : "wallet,amount\nWallet1Address,100\nWallet2Address,200"}
          </code>
        </div>
      )}

      {/* Stats Cards */}
      {recipients.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">Recipients</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm">Valid</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.valid}</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm">Invalid</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{stats.invalid}</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Coins className="w-4 h-4" />
              <span className="text-sm">Total Amount</span>
            </div>
            <p
              className={`text-2xl font-bold ${
                stats.hasEnoughBalance ? "text-white" : "text-red-400"
              }`}
            >
              {stats.totalAmount.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Balance Warning */}
      {selectedToken && stats.totalAmount > 0 && !stats.hasEnoughBalance && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">
              Insufficient balance! You have {selectedToken.balance.toLocaleString()}{" "}
              {selectedToken.symbol} but need {stats.totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div className="mb-6 p-4 rounded-xl bg-white/[0.02] border border-[#fb57ff]/30">
          <div className="flex items-center gap-2 text-sm" style={{ color: "#fb57ff" }}>
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            {statusMessage}
          </div>
          {sending && progress.total > 0 && (
            <div className="mt-2">
              <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#fb57ff] to-purple-600 transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {progress.current} / {progress.total}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recipients Preview */}
      {recipients.length > 0 && !showResults && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">Recipients Preview</h3>
            <span className="text-xs text-gray-500">
              Showing {Math.min(recipients.length, 10)} of {recipients.length}
            </span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recipients.slice(0, 10).map((recipient, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  recipient.valid
                    ? "bg-white/[0.02] border border-white/[0.05]"
                    : "bg-red-500/5 border border-red-500/20"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {recipient.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <span className="font-mono text-sm text-gray-300 truncate">
                    {recipient.wallet.slice(0, 8)}...{recipient.wallet.slice(-8)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {recipient.error && (
                    <span className="text-xs text-red-400">{recipient.error}</span>
                  )}
                  <span className="text-sm font-medium text-white">
                    {recipient.amount.toLocaleString()} {selectedToken?.symbol || ""}
                  </span>
                </div>
              </div>
            ))}
            {recipients.length > 10 && (
              <p className="text-center text-sm text-gray-500 py-2">
                +{recipients.length - 10} more recipients
              </p>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {showResults && results.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">Airdrop Results</h3>
            <button
              onClick={() => setShowResults(false)}
              className="text-xs text-gray-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((result, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  result.status === "success"
                    ? "bg-green-500/5 border border-green-500/20"
                    : "bg-red-500/5 border border-red-500/20"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {result.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <span className="font-mono text-sm text-gray-300 truncate">
                    {result.wallet.slice(0, 8)}...{result.wallet.slice(-8)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">
                    {result.amount.toLocaleString()} {selectedToken?.symbol || ""}
                  </span>
                  {result.signature && (
                    <a
                      href={`https://solscan.io/tx/${result.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#fb57ff] hover:underline"
                    >
                      View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send Button */}
      {stats.valid > 0 && selectedToken && stats.hasEnoughBalance && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#060609]/95 backdrop-blur-sm border-t border-white/[0.05] lg:left-64">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-white font-semibold">
                Send {stats.totalAmount.toLocaleString()} {selectedToken.symbol}
              </p>
              <p className="text-sm text-gray-400">to {stats.valid} wallet(s)</p>
            </div>
            <button
              onClick={sendAirdrop}
              disabled={sending}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(45deg, #fb57ff, #9333ea)" }}
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Airdrop
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {stats.valid > 0 && selectedToken && stats.hasEnoughBalance && <div className="h-24" />}
    </div>
  );
}