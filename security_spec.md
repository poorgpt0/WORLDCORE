# Security Specification

## Data Invariants
1. A User document `uid` must strictly match their authentication `request.auth.uid`. No user can create or modify another user's profile.
2. An AiNft document must belong to the user minting it (`userId` must be `request.auth.uid`), and the user must exist in the `users` collection (atomicity guarantee).
3. The `isVerified`, `hasMintedNFT`, `isNftOwner`, `verifiedWallet`, `mintedAiImage`, and `mintTxHash` fields are strictly managed based on specific actions, and extraneous fields during such updates must be rejected.
4. Timestamps (`createdAt`, `lastLogin`) must strictly be server timestamps (`request.time`).

## The "Dirty Dozen" Payloads
1. User Profile Creation with extra fields (e.g., `isVerified: true`)
2. User Profile Creation for another UID
3. Profile Update Action injecting security fields (`isVerified: true`)
4. NFT Mint Action injecting profile fields (`displayName: "Hacker"`)
5. Security Verification Action spoofing lastLogin timestamp to a client string
6. User Creation missing required `createdAt` server timestamp
7. Ai_Nft Creation referencing another user's ID
8. Ai_Nft Creation spoofing likes (e.g., `likes: 1000`)
9. Ai_Nft Creation omitting required fields (e.g., `txHash`)
10. Ai_Nft Update (which should be totally denied)
11. Ai_Nft Delete (which should be totally denied)
12. Blanket List query without auth or evaluating resource.data
