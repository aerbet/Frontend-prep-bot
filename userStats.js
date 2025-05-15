const userStats = {};

function incrementStat(userId, isCorrect) {
    if (!userStats[userId]) {
        userStats[userId] = { correct: 0, incorrect: 0 };
    }

    if (isCorrect) {
        userStats[userId].correct += 1;
    } else {
        userStats[userId].incorrect += 1;
    }
}

function getStats(userId) {
    if (!userStats[userId]) {
        return { correct: 0, incorrect: 0 };
    }
    return userStats[userId];
}

function resetStats(userId) {
    userStats[userId] = { correct: 0, incorrect: 0 };
}

module.exports = { incrementStat, getStats, resetStats };