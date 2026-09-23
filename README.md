# Budgetly

Budgetly is a personal finance tracker for managing everyday money in one place. It provides a clean dashboard for tracking income, expenses, monthly budgets, savings goals, debts, and financial reports.

## Features

- Email authentication with Supabase
- Dashboard with available balance, monthly income, expenses, and savings
- Daily spending overview based on real transaction data
- Income and expense transaction management
- Monthly budgets by category with progress tracking
- Savings goals and contribution tracking
- Debt tracking with payment progress
- Debt payments recorded automatically as expenses
- Financial reports with monthly trends and category breakdowns
- Account settings with EUR, ALL, USD, and GBP display currencies
- User-specific data protected with Supabase Row Level Security
- Production deployment on Vercel

> Changing the account currency changes how monetary values are displayed. Existing amounts are not automatically converted between currencies.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth & PostgreSQL
- Lucide React
- Vercel

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Dashboard and monthly overview |
| `/transactions` | Income and expense management |
| `/budgets` | Monthly category budgets |
| `/savings` | Savings goals |
| `/debts` | Debt balances and payments |
| `/reports` | Financial reports and trends |
| `/settings` | Profile and currency settings |
| `/login` | Sign in |
| `/register` | Create an account |

## Local Setup

Clone the repository and install the dependencies:

```bash
git clone https://github.com/musashehi/budget-tracker.git
cd budget-tracker
npm install
```

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
```

Never commit `.env.local` or a Supabase service-role key.

Start the development server:

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Production Build

```bash
npm run build
npm start
```

## Deployment

The project is configured for deployment on Vercel. Add the same two public Supabase environment variables to the Vercel project before deploying.

Commits pushed to the connected `main` branch can be deployed automatically by Vercel.

## Project Structure

```text
src/
├── app/
│   ├── budgets/
│   ├── debts/
│   ├── login/
│   ├── register/
│   ├── reports/
│   ├── savings/
│   ├── settings/
│   └── transactions/
├── components/
│   ├── AddTransactionModal.tsx
│   ├── AuthGuard.tsx
│   └── Sidebar.tsx
└── lib/
    ├── currency.ts
    └── supabase.ts
```

## Author

Developed by [musashehi](https://github.com/musashehi).
