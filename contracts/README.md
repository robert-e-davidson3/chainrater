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

Ratings are not a simple weighted average because that is too easy to game.
Instead, a trust graph is used: users choose who and how much to trust, as well
as how much to trust who they themselves trust.

There is a default trusted account focused on blacklisting malicious accounts.
Users do not need to trust them but some default is needed.

Trust is applied to two entities: accounts and URIs. When applied to URIs, the
trust serves to say "this review is heavily manipulated".

The trust graph is stored offchain using IPFS, with the hash stored onchain.
Each account may have a posted trust graph, but it is not required.
