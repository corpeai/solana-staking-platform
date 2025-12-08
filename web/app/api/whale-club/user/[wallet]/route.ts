import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  context: { params: { wallet: string } }
) {
  const wallet = context.params.wallet;

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    const response = await fetch(
      `${url}/rest/v1/whale_club_users?wallet_address=eq.${wallet}&select=*`,
      {
        headers: {
          'apikey': key!,
          'Authorization': `Bearer ${key}`,
        },
        cache: 'no-store',
      }
    );

    const data = await response.json();

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = data[0];
    
    const res = NextResponse.json({
      walletAddress: user.wallet_address,
      twitterId: user.twitter_id,
      twitterUsername: user.twitter_username,
      nickname: user.nickname,
      totalPoints: user.total_points || 0,
      likesCount: user.likes_count || 0,
      retweetsCount: user.retweets_count || 0,
      quotesCount: user.quotes_count || 0,
      lastSyncedAt: user.last_synced_at,
      createdAt: user.created_at,
    });

    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    return res;
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}