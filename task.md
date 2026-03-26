# Task Plan - Complete Overhaul

## Issues to fix:
1. **Bugs/errors** - debt creation payload typing, `debt_type` field, profile update not propagating currency/locale
2. **Performance** - heavy re-renders, no memoization, no Suspense
3. **Loading data** - remove long loading states, use optimistic cached snapshots  
4. **Features complete** - all CRUD fully functional
5. **Gold price auto-refresh** - change from 24h cache to 1-second auto-refresh
6. **Realtime data** - add Supabase realtime subscriptions
7. **Mobile friendly** - dialog scrollable, buttons always visible, safe-area, responsive
8. **Modern UI** - glass morphism, gradients, animations, modern cards
9. **Language/currency** - formatCurrency must use profile currency, formatDate must use profile locale
10. **Mature features** - all features polished and complete
11. **Lightweight** - minimize bundle, optimize imports
12. **Number formatting** - auto-format with dots (1.000.000) while typing
13. **Debt/piutang not working** - fix payload, remaining_amount default, payment flow

## Key Changes:
- Create CurrencyInput component with auto-formatting (1.000.000)
- Fix formatCurrency to accept dynamic currency from profile context
- Fix gold price to auto-refresh every 1 second
- Fix debt creation - debtType field mapping, payload structure
- Fix profile update - currency/locale propagation
- Make all dialogs scrollable on mobile
- Add safe-area padding for mobile nav
- Ensure all save buttons are visible on small screens
