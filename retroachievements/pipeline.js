require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
    buildAuthorization,
    getUserProfile,
    getUserRecentAchievements,
    getUserCompletionProgress,
    getUserAwards,
    getUserPoints,
    getGameInfoAndUserProgress,
    getUserRecentlyPlayedGames,
    getUserSummary,
    getUserWantToPlayList
} = require('@retroachievements/api');

const admin = require('firebase-admin');

// =========================================================
// Phase 1: Authentication and Infrastructure Initialization
// =========================================================

const RA_USERNAME = process.env.RA_USERNAME;
const RA_API_KEY = process.env.RA_API_KEY;

if (!RA_USERNAME || !RA_API_KEY) {
    console.error("CRITICAL HALT: RetroAchievements credentials missing.");
    process.exit(1);
}

const authorization = buildAuthorization({
    username: RA_USERNAME,
    webApiKey: RA_API_KEY
});

// Initialize the Firebase Admin SDK. 
// GOOGLE_APPLICATION_CREDENTIALS must point to the Service Account JSON path.
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
}

const db = admin.firestore();

// Mandatory delay to respect API rate limits
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// =========================================================
// Phase 2: Profile Data & Detailed Game Extraction
// =========================================================

async function executeProfileExtraction(targetUser) {
    console.log(`Initiating profile extraction for user: ${targetUser}`);

    const profilePayload = {
        metadata: { extractionTimestamp: new Date().toISOString() },
        username: targetUser,
        coreProfile: null,
        userSummary: null,
        points: null,
        pageAwards: null,
        recentAchievements: null,
        recentlyPlayedGames: null,
        wantToPlayList: null,
        gameAwardsAndProgress: null,
        detailedGameProgress: {}     // This object will act as our local cache to prevent duplicate fetches
    };

    try {
        profilePayload.coreProfile = await getUserProfile(authorization, { username: targetUser });
        await sleep(1500);

        profilePayload.userSummary = await getUserSummary(authorization, { username: targetUser });
        await sleep(1500);

        profilePayload.points = await getUserPoints(authorization, { username: targetUser });
        await sleep(1500);

        // Fetch Awards
        profilePayload.pageAwards = await getUserAwards(authorization, { username: targetUser });
        await sleep(1500);

        // --- DATA OVERRIDE: Patreon Site Award Icon Injection ---
        if (profilePayload.pageAwards && profilePayload.pageAwards.visibleUserAwards) {
            profilePayload.pageAwards.visibleUserAwards.forEach(award => {
                if (award.awardType && award.awardType.toLowerCase().includes('patreon')) {
                    // Override the relative path with the static absolute URL
                    award.imageIcon = "https://static.retroachievements.org/assets/images/badge/patreon.png";
                }
            });
        }

        profilePayload.recentAchievements = await getUserRecentAchievements(authorization, { username: targetUser, recentMinutes: 259200 });
        await sleep(1500);

        profilePayload.recentlyPlayedGames = await getUserRecentlyPlayedGames(authorization, { username: targetUser });
        await sleep(1500);

        profilePayload.wantToPlayList = await getUserWantToPlayList(authorization, {
            username: targetUser,
            count: 500
        });
        await sleep(1500);

        profilePayload.gameAwardsAndProgress = await getUserCompletionProgress(authorization, { username: targetUser });
        await sleep(1500);

        // =========================================================================
        // SEPARATE FETCH PROCESSES: 1. Completion Progress -> 2. Recent Games
        // =========================================================================

        // 1. Process Completion Progress Section FIRST
        const progressGames = profilePayload.gameAwardsAndProgress?.results || [];
        if (progressGames.length > 0) {
            console.log(`\nFetching achievement details for ${progressGames.length} Completion Progress Games...`);

            for (const game of progressGames) {
                // Check if we already fetched it (just in case there are duplicates in the API response itself)
                if (!profilePayload.detailedGameProgress[game.gameId]) {
                    console.log(`Fetching details for Progress Game [${game.gameId}]: ${game.title}`);
                    try {
                        const gameDetails = await getGameInfoAndUserProgress(authorization, {
                            username: targetUser,
                            gameId: game.gameId
                        });
                        profilePayload.detailedGameProgress[game.gameId] = gameDetails;
                    } catch (e) {
                        console.error(`Failed to fetch details for Progress Game [${game.gameId}]: ${game.title}`);
                        console.error(`Error Message:`, e.message);
                    }
                    await sleep(2000);
                }
            }
        }

        // 2. Process Recently Played Games Section SECOND
        if (profilePayload.recentlyPlayedGames && profilePayload.recentlyPlayedGames.length > 0) {
            console.log(`\nFetching achievement details for ${profilePayload.recentlyPlayedGames.length} Recently Played Games...`);

            for (const game of profilePayload.recentlyPlayedGames) {
                // If it already exists in the dictionary from the Progress loop, skip the API fetch!
                if (profilePayload.detailedGameProgress[game.gameId]) {
                    console.log(`Game [${game.gameId}]: ${game.title} already cached from Progress. Skipping API fetch.`);
                } else {
                    console.log(`Fetching details for Recent Game [${game.gameId}]: ${game.title}`);
                    try {
                        const gameDetails = await getGameInfoAndUserProgress(authorization, {
                            username: targetUser,
                            gameId: game.gameId
                        });
                        profilePayload.detailedGameProgress[game.gameId] = gameDetails;
                    } catch (e) {
                        console.error(`Failed to fetch details for Recent Game [${game.gameId}]: ${game.title}`);
                        console.error(`Error Message:`, e.message);
                    }
                    await sleep(2000);
                }
            }
        }

        return profilePayload;

    } catch (error) {
        console.error("Failure during RetroAchievements API extraction:", error);
        throw error;
    }
}

// =========================================================
// Phase 3: Local JSON Serialization
// =========================================================

function serializeLocally(payload, destinationName) {
    const filePath = path.join(__dirname, destinationName);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 4), 'utf8');
    console.log(`\nPayload serialized locally to: ${filePath}`);
}

// =========================================================
// Phase 4: Firebase Firestore Subcollection Synchronization
// =========================================================

async function synchronizeWithFirestore(data) {
    console.log("Commencing Firestore idempotent synchronization...");

    // Using the username as the Document ID guarantees idempotency
    const userDocRef = db.collection('retro_profiles').doc(data.username);

    // 4a. Synchronize the Root Profile Document
    // We isolate the root data so we don't exceed Firestore's 1MB document limit
    const rootPayload = {
        metadata: data.metadata,
        username: data.username,
        coreProfile: data.coreProfile,
        userSummary: data.userSummary,
        points: data.points,
        pageAwards: data.pageAwards,
        recentAchievements: data.recentAchievements,
        recentlyPlayedGames: data.recentlyPlayedGames,
        wantToPlayList: data.wantToPlayList,
        gameAwardsAndProgress: data.gameAwardsAndProgress
    };

    await userDocRef.set(rootPayload, { merge: true });
    console.log(`Firestore root document for ${data.username} successfully upserted.`);

    // 4b. Synchronize Detailed Game Data into a Subcollection via Batched Writes
    if (data.detailedGameProgress && Object.keys(data.detailedGameProgress).length > 0) {
        console.log(`Synchronizing ${Object.keys(data.detailedGameProgress).length} detailed game records into subcollection...`);
        let batch = db.batch();
        let operationCount = 0;

        for (const [gameId, gameDetails] of Object.entries(data.detailedGameProgress)) {
            // Write each game's deep achievements to: /retro_profiles/{username}/games/{gameId}
            const gameDocRef = userDocRef.collection('games').doc(gameId.toString());
            batch.set(gameDocRef, gameDetails, { merge: true });
            operationCount++;

            // Firestore limits batches to 500 operations
            if (operationCount >= 490) {
                await batch.commit();
                console.log("Intermediate Firestore batch committed.");
                batch = db.batch(); // Reinitialize
                operationCount = 0;
                await sleep(1000);
            }
        }

        // Commit remaining records
        if (operationCount > 0) {
            await batch.commit();
            console.log("Final Firestore game batch committed successfully.");
        }
    }
}

// =========================================================
// Phase 5: ETL Orchestration Sequence
// =========================================================

async function runPipeline() {
    try {
        const payload = await executeProfileExtraction(RA_USERNAME);

        const timestamp = Date.now();
        const fileName = `data.json`;

        serializeLocally(payload, fileName);
        // await synchronizeWithFirestore(payload);

        console.log("Profile ETL Pipeline executed successfully. Terminating process.");
        process.exit(0);
    } catch (error) {
        console.error("Pipeline execution aborted.", error);
        process.exit(1);
    }
}

runPipeline();
