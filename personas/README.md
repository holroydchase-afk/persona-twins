# Persona template pack

Three example stakeholder twins and a blank template. Use them as they are, or rewrite them from real people.

| File | Who | Judges your product by |
|---|---|---|
| `customer.md` | Maya, operations manager who buys with her own budget | Can my team use it this afternoon, and what does it cost? |
| `sales.md` | Marcus, account executive | Can I demo this tomorrow and close? |
| `legal.md` | Elena, in-house counsel | What data goes where, and what does it promise? |
| `TEMPLATE.md` | Blank | Fill it in |

## Writing a good twin

Base it on one real person, not a segment. A twin built from "SMB buyers" sounds like a consultant; a twin built
from the ops manager you talked to last week sounds like her.

Ask the real person, or recall from past conversations:

1. What were you trying to get done the last time you looked at a tool like this?
2. What would make buying it a mistake you'd have to explain to your boss?
3. What on a screen makes you close the tab?
4. What would make you say yes on the spot?
5. What's a phrase you'd use to describe a bad product?

Put the answers into `goals`, `fears`, `pet_peeves`, `wins_them_over` and `sample_quotes`. Pet peeves and quotes do
the most work: keep them specific ("Pricing hidden behind 'Contact sales'"), not general ("bad UX").

## Using a new persona

- **Command line:** `cd cli && npx tsx twin.ts -p ../personas/your-file.md -s screen.png`
- **Claude page:** run `npm run sync-personas` in `cli/` to copy every file in this folder into `persona-twins.html`,
  then publish the page as a Claude artifact.
