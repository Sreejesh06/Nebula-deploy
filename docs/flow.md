# User Flow

## Auth flow
1. User lands on /
2. If not logged in → redirect to /login
3. Login with email + password via Supabase Auth
4. On success → redirect to /dashboard

## Main flow
1. /dashboard → shows [MAIN CONTENT]
2. User clicks [ACTION] → goes to /[FEATURE PAGE]
3. User does [CORE ACTION]
4. Result shown on screen

## Edge cases to handle
- User not logged in → redirect to /login
- Supabase error → show error message, don't crash
- Empty states → show helpful message, not blank screen
- Loading states → show skeleton or spinner, not layout shift
