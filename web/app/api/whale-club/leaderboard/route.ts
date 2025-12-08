import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    const response = await fetch(
      `${url}/rest/v1/whale_club_users?select=wallet_address,twitter_username,nickname,total_points,likes_count,retweets_count,quotes_count&twitter_username=neq._oauth_holder&order=total_points.desc&limit=20`,
      {
        headers: {
          'apikey': key!,
          'Authorization': `Bearer ${key}`,
        },
        cache: 'no-store',
      }
    );

    const data = await response.json();

    const res = NextResponse.json(
      data.map((user: any) => ({
        walletAddress: user.wallet_address,
        twitterUsername: user.twitter_username,
        nickname: user.nickname,
        totalPoints: user.total_points || 0,
        likesCount: user.likes_count || 0,
        retweetsCount: user.retweets_count || 0,
        quotesCount: user.quotes_count || 0,
      }))
    );

    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    return res;
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}