# Mechanism

Anything may be rated so long as it can be referred to by a URI. A custom URI
schema (or schemas) will be designed for common usecases.

A stake is required to rate. There are three factors in staking:
1. A small amount is always required. This ensures "skin in the game" and helps
   with the cleanup incentive (explained later).
2. User may add more than the minimum. This has two effects:
  2a. The rating lasts longer.
  2b. The rating has more weight.

Rating do not last forever. When their timer runs out, anyone may take down the
rating in order to recoup the stake. The larger the stake, the larger the timer.
