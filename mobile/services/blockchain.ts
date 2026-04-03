// Solana blockchain integration for DIDs and Social Impact Tokens
// Uses Solana Mobile Wallet Adapter for secure signing
import {
  transact,
  Web3MobileWallet,
} from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  clusterApiUrl,
} from "@solana/web3.js";

const SOLANA_CLUSTER = "devnet";
const connection = new Connection(clusterApiUrl(SOLANA_CLUSTER));

// Social Impact Token program ID (deployed smart contract)
const SIT_PROGRAM_ID = new PublicKey(
  process.env.EXPO_PUBLIC_SIT_PROGRAM_ID ??
    "SIT1111111111111111111111111111111111111111"
);

export interface VolunteerDID {
  did: string; // W3C DID format: did:sol:<pubkey>
  publicKey: string;
  walletAddress: string;
}

export interface SocialImpactToken {
  mint: string;
  sdgCategory: string;
  impactDescription: string;
  timestamp: number;
}

/**
 * Authorize with Solana Mobile Wallet and create a W3C DID.
 * The DID is derived from the wallet's public key.
 */
export async function createVolunteerDID(): Promise<VolunteerDID> {
  const result = await transact(async (wallet: Web3MobileWallet) => {
    // Request authorization from the mobile wallet
    const authResult = await wallet.authorize({
      identity: {
        name: "GraminSync",
        uri: "https://graminsync.app",
        icon: "favicon.ico",
      },
      cluster: SOLANA_CLUSTER,
    });

    const pubkey = new PublicKey(authResult.accounts[0].address);

    return {
      did: `did:sol:${pubkey.toBase58()}`,
      publicKey: pubkey.toBase58(),
      walletAddress: pubkey.toBase58(),
    };
  });

  return result;
}

/**
 * Mint a non-transferable Social Impact Token (SIT) as an NFT.
 * This is called after verified task completion.
 */
export async function mintSocialImpactToken(
  sdgCategory: string,
  impactDescription: string,
  taskId: string
): Promise<SocialImpactToken> {
  const result = await transact(async (wallet: Web3MobileWallet) => {
    const authResult = await wallet.authorize({
      identity: {
        name: "GraminSync",
        uri: "https://graminsync.app",
        icon: "favicon.ico",
      },
      cluster: SOLANA_CLUSTER,
    });

    const pubkey = new PublicKey(authResult.accounts[0].address);

    // Create the mint instruction for the SIT program
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: pubkey,
        toPubkey: SIT_PROGRAM_ID,
        lamports: 0, // No SOL transfer, just instruction data
      })
    );

    // Add SIT program instruction data
    transaction.add({
      keys: [
        { pubkey, isSigner: true, isWritable: true },
        { pubkey: SIT_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: SIT_PROGRAM_ID,
      data: Buffer.from(
        JSON.stringify({
          instruction: "mint_sit",
          sdg_category: sdgCategory,
          impact_description: impactDescription,
          task_id: taskId,
          non_transferable: true,
        })
      ),
    });

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = pubkey;

    // Sign and send via mobile wallet
    const signedTxs = await wallet.signTransactions({
      transactions: [transaction],
    });

    const txSignature = await connection.sendRawTransaction(
      signedTxs[0].serialize()
    );

    await connection.confirmTransaction(txSignature);

    return {
      mint: txSignature,
      sdgCategory,
      impactDescription,
      timestamp: Date.now(),
    };
  });

  return result;
}

/**
 * Fetch the social resume (all SITs) for a volunteer's DID.
 */
export async function getSocialResume(
  walletAddress: string
): Promise<SocialImpactToken[]> {
  const pubkey = new PublicKey(walletAddress);
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: SIT_PROGRAM_ID,
  });

  return tokenAccounts.value.map((account) => ({
    mint: account.pubkey.toBase58(),
    sdgCategory: "Unknown", // Would be parsed from on-chain metadata
    impactDescription: "Verified social impact contribution",
    timestamp: Date.now(),
  }));
}
