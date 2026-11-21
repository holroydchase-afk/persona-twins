# Persona template pack

Seven example stakeholder twins and a blank template. All are fictional. Use them as they are, or rewrite them from
real people. The page lists them least tech-savvy first, so the twin most likely to get stuck is the default.

| File | Who | Judges your product by |
|---|---|---|
| `everyday.md` | Rosa, non-technical, uses it on her phone | Can I get it done first try, and would I know it worked? |
| `customer.md` | Maya, operations manager who buys and renews with her own budget | Is it worth the price, can I trust it, and can I leave? |
| `skeptic.md` | Dana, analyst who vets tools before her team commits | What's the catch, and do the screens back up the claims? |
| `marketing.md` | Priya, head of marketing | Who is it for, and is the message clear from headline to button? |
| `sales.md` | Marcus, account executive | Can I demo this tomorrow and close? |
| `finance.md` | Graham, a blunt, cost-obsessed CFO | What does it cost per year, all in, and what does it save? |
| `product.md` | Nadia, head of product | What's the one job, and how would you know it's working? |
| `TEMPLATE.md` | Blank | Fill it in |

Every twin reviews with the same rules in [`../review-protocol.md`](../review-protocol.md): four questions per
screenshot, a plain-language check, a platform check, and one fix in quotes for every objection. Personas set who
is talking; the protocol sets how they review. Each file's `label` is what the page's picker shows, like
"Maya (paying customer)".

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
- **Claude page:** run `npm run sync-personas` in `cli/` to copy every file in this folder into `stakeholder-twins.html`,
  then publish the page as a Claude artifact. The page lists twins in the order set in `cli/sync-personas.ts`; new
  ids go after the seven, alphabetically.
