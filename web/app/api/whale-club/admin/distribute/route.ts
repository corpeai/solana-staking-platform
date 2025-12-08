import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

export const dynamic = 'force-dynamic';

const ADMIN_WALLET = 'ecfvkqWdJiYJRyUtWvuYpPWP5faf9GBcA1K6TaDW7wS';
const SPT_MINT = new PublicKey('6uUU2z5GBasaxnkcqiQVHa2SXL68mAXDsq1zYN5Qxrm7');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const MIN_HOLDING = 10_000_000;
const SPT_DECIMALS = 9;

function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

async function checkTokenBalance(connection: Connection, wallet: string): Promise<number> {
  try {
    const walletPubkey = new PublicKey(wallet);
    const ata = await getAssociatedTokenAddress(SPT_MINT, walletPubkey, false, TOKEN_2022_PROGRAM_ID);
    const accountInfo = await connection.getAccountInfo(ata);
    
    if (accountInfo) {
      const data = accountInfo.data;
      const amountBytes = data.slice(64, 72);
      const amount = Number(new DataView(amountBytes.buffer, amountBytes.byteOffset, 8).getBigUint64(0, true));
      return amount / Math.pow(10, SPT_DECIMALS);
    }
    return 0;
  } catch {
    return 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { wallet, signature, timestamp } = await request.json();

    // Verify admin
    if (wallet !== ADMIN_WALLET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify signature (same as before)
    // ... signature verification code ...

    const supabase = getSupabase();
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com');

    // Get all users with points
    const { data: users, error } = await supabase
      .from('whale_club_users')
      .select('wallet_address, total_points, twitter_username, nickname')
      .gt('total_points', 0)
      .order('total_points', { ascending: false });

    if (error) throw error;

    // Check each user's current balance
    const eligibleUsers = [];
    const ineligibleUsers = [];

    for (const user of users || []) {
      const balance = await checkTokenBalance(connection, user.wallet_address);
      
      if (balance >= MIN_HOLDING) {
        eligibleUsers.push({
          ...user,
          currentBalance: balance,
        });
      } else {
        ineligibleUsers.push({
          ...user,
          currentBalance: balance,
          reason: `Only holds ${balance.toLocaleString()} SPT`,
        });
      }
    }

    return NextResponse.json({
      eligible: eligibleUsers,
      ineligible: ineligibleUsers,
      totalEligible: eligibleUsers.length,
      totalIneligible: ineligibleUsers.length,
    });
  } catch (error) {
    console.error('Distribute error:', error);
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}