'use strict';
const models = require('./models');
const random_name = require('node-random-name');
const _ = require('underscore');
const dbConn = models.dbConn;

/**
 * User Configuration
 */
const numberOfPlayers = 500;

/**
 * Internal configuration
 */
const positions = {
    GK: 'שוער',
    CD: 'מגן',
    MD: 'קשר',
    ST: 'חלוץ'
};
const iscountconf = {
    countries: ['ישראל', 'ברזיל', 'פורטוגל', 'אנגליה', 'גרמניה', 'איטליה', 'צרפת', 'ספרד'],
    positions: positions,
    positionsToId: {
        1: positions.GK,
        2: positions.CD,
        3: positions.MD,
        4: positions.ST
    },
    feet: ['שמאל', 'ימין'],
    stats_params: {
        assists: 'assists',
        goals: 'goals',
        average_km_per_game: 'average_km_per_game'
    }
};
const numberRandomize = function (min, max, isDouble) {

    if (!isDouble) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    } else {
        return Math.random() * (max - min) + min;
    }
};
/**
 * Randomize specific parameter by player position
 * @param parameter - statistical parameter (goals, assists, average_km_per_game)
 * @param playerPosition
 * @returns {number}
 */
const getStatByPlayerPosition = function (parameter, playerPosition) {

    // Switches on current player position
    switch(playerPosition) {
        case iscountconf.positions.GK:
            if (parameter === iscountconf.stats_params.average_km_per_game) {
                return numberRandomize(0.1, 1, true);
            } else {
                return 0;
            }
            break;
        case iscountconf.positions.CD:
            if (parameter === iscountconf.stats_params.average_km_per_game) {
                return numberRandomize(3, 6, true);
            } else if (parameter === iscountconf.stats_params.goals){
                return numberRandomize(0, 3 + 1, false);
            } else if (parameter === iscountconf.stats_params.assists){
                return numberRandomize(0, 2 + 1, false);
            }
            break;
        case iscountconf.positions.MD:
            if (parameter === iscountconf.stats_params.average_km_per_game) {
                return numberRandomize(4, 10, true);
            } else if (parameter === iscountconf.stats_params.goals){
                return numberRandomize(0, 15 + 1, false);
            } else if (parameter === iscountconf.stats_params.assists){
                return numberRandomize(0, 21 + 1, false);
            }
            break;
        case iscountconf.positions.ST:
            if (parameter === iscountconf.stats_params.average_km_per_game) {
                return numberRandomize(5, 9, true);
            } else if (parameter === iscountconf.stats_params.goals){
                return numberRandomize(0, 20 + 1, false);
            } else if (parameter === iscountconf.stats_params.assists){
                return numberRandomize(0, 12 + 1, false);
            }
            break;
        default:
            return -1;
    }
};
/**
 * Generate specific player yearly statistics - currently random
 * @param playerPosition
 * @returns {{year: number, goals: number, assists: number, game_in_starting_linup,
  *          games_entered_from_bench, yellow_cards, red_cards, average_km_per_game: number}}
 */
const generatePlayerStats = function(playerPosition){
    return {
        year: 2018,
        goals: getStatByPlayerPosition(iscountconf.stats_params.goals, playerPosition),
        assists: getStatByPlayerPosition(iscountconf.stats_params.assists, playerPosition),
        game_in_starting_linup: numberRandomize(0, 35 + 1, false),
        games_entered_from_bench: numberRandomize(0, 22 + 1, false),
        yellow_cards: numberRandomize(0, 13 + 1, false),
        red_cards: numberRandomize(0, 6 + 1, false),
        average_km_per_game: getStatByPlayerPosition(iscountconf.stats_params.average_km_per_game, playerPosition)
    };
};
const generatePlayerBasicInfo = function () {
    return {
        name: random_name({ gender: "male", random: Math.random }),
        age: numberRandomize(18, 35 + 1, false),
        favourite_leg: iscountconf.feet[numberRandomize(0, iscountconf.feet.length, false)],
        position: numberRandomize(1, 4 + 1, false),
        country: iscountconf.countries[numberRandomize(0, iscountconf.countries.length, false)],
        team: numberRandomize(1, 17 + 1, false)
    };
};

/**
 * Script Starts here
 */

let players = [];
let thisSession = {};
// Creates Players
for (let i = 0; i < numberOfPlayers; i++) {
    let currentPlayer = {
            basicInfo: generatePlayerBasicInfo(),
    };

    if (thisSession.hasOwnProperty(currentPlayer.basicInfo.name)) {
        console.log(1);
    } else {
        thisSession[currentPlayer.basicInfo.name] = 1;
    }

    currentPlayer.stats = generatePlayerStats(iscountconf.positionsToId[currentPlayer.basicInfo.position]);

    // Pushes to all players array
    players.push(currentPlayer);
}

// Inserts to DB
dbConn.beginTransaction(function(err) {

    if (err){
        console.log(123);
    } else {

        // Prepare bulk data
        let values1 = _.map(players, (currentPlayer) => {
            return [currentPlayer.basicInfo.name,
                currentPlayer.basicInfo.age,
                currentPlayer.basicInfo.favourite_leg,
                currentPlayer.basicInfo.position,
                currentPlayer.basicInfo.country,
                currentPlayer.basicInfo.team]
        });

        dbConn.query(`INSERT INTO players_basic_info
                     (name, age, favourite_leg, position, country, team)
                     VALUES ?`, [values1], (err, res1) => {
            if (err) {
                console.log(err);
            } else {

                let firstId = res1.insertId;

                // Prepare bulk data
                let values2 = _.map(players, (currentPlayer) => {
                    let ret = [firstId,
                               currentPlayer.stats.year,
                               currentPlayer.stats.goals,
                               currentPlayer.stats.assists,
                               currentPlayer.stats.game_in_starting_linup,
                               currentPlayer.stats.games_entered_from_bench,
                               currentPlayer.stats.yellow_cards,
                               currentPlayer.stats.red_cards,
                               currentPlayer.stats.average_km_per_game];
                    firstId += 1;
                    return ret;
                });

                dbConn.query(`INSERT INTO players_yearly_statistics
                              (player_id, year, goals, assists, games_in_starting_linup,
                              games_entered_from_bench,yellow_cards,red_cards,
                              average_km_per_game)
                              VALUES ?`, [values2], (err, res2) => {
                    if (err){
                        dbConn.rollback(function () {
                            console.log('rollbackkk');
                        });
                    } else {

                        // Commit
                        dbConn.commit(function (err) {

                            if (err){
                                dbConn.rollback(function () {
                                    console.log('rollbackkk');
                                });
                            } else {
                                console.log('YESS!!!');
                                process.exit();
                            }
                        });
                    }
                });
            }
        })
    }
});