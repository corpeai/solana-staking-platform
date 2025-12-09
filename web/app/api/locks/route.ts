import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TelegramBotService } from '@/lib/telegram-bot';

// GET all locks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    const active = searchParams.get('active');

    const where: any = {};

    if (wallet) {
      where.creatorWallet = wallet;
    }

    if (active === 'true') {
      where.isActive = true;
      where.isUnlocked = false;
    }

    const locks = await prisma.lock.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const locksResponse = locks.map(lock => ({
      ...lock,
      lockId: lock.lockId.toString(),
    }));

    return NextResponse.json(locksResponse);
  } catch (error) {
    console.error('Error fetching locks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locks' },
      { status: 500 }
    );
  }
}

// POST create new lock
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      lockId,
      tokenMint,
      name,
      symbol,
      amount,
      lockDuration,
      creatorWallet,
      poolAddress,
      stakePda,
      poolId,
      logo,
    } = body;

    if (!tokenMint || !name || !symbol || !amount || !lockDuration || !creatorWallet) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const unlockTime = new Date(Date.now() + lockDuration * 1000);
    const lockIdBigInt = BigInt(lockId || Date.now());

    const lock = await prisma.lock.upsert({
      where: {
        lock_token_lock_id_unique: {
          tokenMint,
          lockId: lockIdBigInt,
        },
      },
      update: {
        amount: parseFloat(amount),
        unlockTime,
        updatedAt: new Date(),
      },
      create: {
        lockId: lockIdBigInt,
        tokenMint,
        name,
        symbol,
        amount: parseFloat(amount),
        lockDuration,
        unlockTime,
        creatorWallet,
        poolAddress: poolAddress || null,
        stakePda: stakePda || null,
        poolId: poolId !== undefined ? poolId : null,
        logo: logo || null,
        isActive: true,
        isUnlocked: false,
      },
    });

    // 📢 Send Telegram alert for new lock
    try {
      const telegramBot = new TelegramBotService(prisma);
      await telegramBot.sendLockCreatedAlert({
        tokenName: name,
        tokenSymbol: symbol,
        amount: parseFloat(amount),
        lockDurationDays: Math.floor(lockDuration / 86400),
        creatorWallet,
        tokenLogo: logo || undefined,
      });
    } catch (telegramError) {
      console.error('⚠️ Telegram lock alert failed:', telegramError);
    }

    const lockResponse = {
      ...lock,
      lockId: lock.lockId.toString(),
    };

    return NextResponse.json(lockResponse, { status: 201 });
  } catch (error: any) {
    console.error('Error creating lock:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create lock',
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}